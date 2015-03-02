/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var env = require('../../utils/env');
var config = env.config;
var logger = env.logger;
// TODO: add stats
// var stats  = env.stats;

var EXPIRY_HASH_KEY = "ex";
var ETAG_HASH_KEY = "et";
var CONTENT_HASH_KEY = "c";

var Wreck = require('wreck');

var zlib = require('zlib');
var url = require('url');
var redisClient = env.redis.createClient(config.get("redis_http_cache"));
var fs = require('fs');
var Schema = require('protobuf').Schema;
var schema = new Schema(fs.readFileSync(__dirname + '/http-cache-message.desc'));
var HttpCacheMessage = schema['gitter.http.cache.HttpCacheMessage'];

function getKey(url, token) {
  var key;
  if (token) {
    key = new Buffer(url + ":" + token, 'utf8').toString('base64');
  } else {
    key = new Buffer(url, 'utf8').toString('base64');
  }

  return 'hc:' + key;
}

function lookupEtagExpiry(key, callback) {
  redisClient.hmget(key, EXPIRY_HASH_KEY, ETAG_HASH_KEY, function(err, result) {
    if (err) return callback(err);
    if (!result || (!result[0] && !result[1])) return callback();

    var expiry, etag;
    if (result[0]) {
      expiry = parseInt(result[0].toString('utf8'), 10);
      if (isNaN(expiry)) expiry = null;
    }

    if (result[1]) {
      etag = result[1].toString('utf8');
    }

    return callback(null, {
      expiry: expiry,
      etag: etag
    });

  });
}

function lookupContent(key, callback) {
  redisClient.hmget(key, CONTENT_HASH_KEY, function(err, result) {
    if (err) return callback(err);
    if (!result || !result[0]) return callback();

    try {
      var proto = HttpCacheMessage.parse(result[0]);

      /* Convert the headers back */
      proto.headers = proto.headers.reduce(function(memo, header) {
        memo[header.name] = header.value;
        return memo;
      }, {});

      if (proto.bodyCompressed) {
        zlib.gunzip(proto.bodyCompressed, function(err, body) {
          if (err) return callback(err);
          proto.body = body.toString('utf8');
          return callback(null, proto);
        });
      } else {
        return callback(null, proto);
      }

    } catch (err) {
      return callback(err);
    }

  });
}

function store(key, statusCode, etag, expiry, headers, body, callback) {
  if (!body) {
    /* Non gzip version */
    try {
      var proto = HttpCacheMessage.serialize({
        statusCode: statusCode,
        headers: Object.keys(headers).map(function(name) {
          return { name: name, value: headers[name] };
        }),
        bodyCompressed: null
      });

      redisClient.hmset(key, EXPIRY_HASH_KEY, expiry, ETAG_HASH_KEY, etag, CONTENT_HASH_KEY, proto, callback);

    } catch(err) {
      return callback(err);
    }
    return;
  }

  if (!Buffer.isBuffer(body) && typeof body === 'object') {
    body = JSON.stringify(body);
  }

  /* Gzip the body */
  zlib.gzip(body, function(err, compressed) {
    if (err) return callback(err);

    try {
      var proto = HttpCacheMessage.serialize({
        statusCode: statusCode,
        bodyCompressed: compressed,
        headers: Object.keys(headers).map(function(name) {
          return { name: name, value: headers[name] };
        })
      });

      redisClient.hmset(key, EXPIRY_HASH_KEY, expiry, ETAG_HASH_KEY, etag, CONTENT_HASH_KEY, proto, callback);

    } catch(err) {
      return callback(err);
    }
  });
}

function updateExpiry(key, expiry, callback) {
  /* TODO: check that the key hasn't just been removed */
  redisClient.hmset(key, EXPIRY_HASH_KEY, expiry, callback);
}

function makeResponse(cachedContent) {
  return {
    statusCode: parseInt(cachedContent.statusCode, 10),
    headers: cachedContent.headers
  };
}

function doSuccessCallback(options, cachedContent, callback) {
  if (options.json) {
    /* Use the cached response */
    try {
      var parsed = JSON.parse(cachedContent.body);
      return callback(null, makeResponse(cachedContent), parsed);
    } catch(e) {
      return callback(e);
    }
  }

  /* Use the cached response */
  return callback(null, makeResponse(cachedContent), cachedContent.body);
}

module.exports = exports = function(request) {
  function makeRequest(requestUrl, accessToken, options, key, etagExpiry, callback) {
    var etag = etagExpiry && etagExpiry.etag;

    /* If we have an etag, always use it */
    if (etag) {
      if (!options.headers) {
        options.headers = {};
      }
      options.headers['If-None-Match'] = etag;
    }

    request(options, function(err, response, body) {
      if (err) {
        if (etagExpiry) {
          logger.warn('http.cache upstream failure. Using cached response: ' + err, { exception: err});
          return lookupContent(key, function(err2, cachedContent) {
            if (err2) {
              logger.warn('Error looking up cache content: ' + err2, { exception: err2 });
            }

            if (err2 || !cachedContent) return callback(err, response, body); // Unable to lookup content

            return doSuccessCallback(options, cachedContent, function(_err, _response, _body) {
              if (_err) {
                logger.warn('Error parsing cache content: ' + err2, { exception: err2 });
                return callback(err, response, body);
              }

              return callback(null, _response, _body);
            });
          });
        } else {
          return callback(err, response, body);
        }

        return;
      }

      if (etag && response.statusCode === 304) {
        return lookupContent(key, function(err, cachedContent) {
          /* Corrupted data - reissue the request without the cache */
          if (err || !cachedContent) return makeRequest(requestUrl, accessToken, options, key, null, callback);

          return doSuccessCallback(options, cachedContent, function(err, _response, _body) {
            if (err) {
              logger.warn('Error parsing cache content: ' + err, { exception: err });
              return makeRequest(requestUrl, accessToken, options, key, null, callback);
            }

            if (response.headers['cache-control']) {
              var cacheHeader = Wreck.parseCacheControl(response.headers['cache-control']);
              var expiry = Date.now();
              if (cacheHeader && cacheHeader['max-age']) {
                expiry += cacheHeader['max-age'] * 1000;
              }

              updateExpiry(key, expiry, function(err) {
                if (err) {
                  logger.warn('Unable to update expiry for content: ' + err, { exception: err });
                }
              });
            }


            return callback(null, _response, _body);
          });
        });
      }

      var responseEtag = response.headers.etag;

      if (response.headers['cache-control']) {
        var cacheHeader = Wreck.parseCacheControl(response.headers['cache-control']);
        var expiry = Date.now();
        if (cacheHeader && cacheHeader['max-age']) {
          expiry += cacheHeader['max-age'] * 1000;
        }

        if (responseEtag && response.statusCode === 200) {
          /* Store the cache response async */
          store(key, response.statusCode, responseEtag, expiry, response.headers, body, function(err) {
            if (err) {
              logger.warn('http.cache cache storage failure: ' + err, { exception: err});
            }
          });
        }

      }


      callback(null, response, body);
    });

  }
  return function requestWrapper(options, callback) {
    var method = options.method ? options.method.toUpperCase() : 'GET'; /* default is GET */

    /* Only for GET */
    if (method !== 'GET') {
      return request(options, callback);
    }

    var requestUrl = options.uri || options.url;

    var accessToken;
    if (options.headers) {
      var authHeader = options.headers.Authorization || options.headers.authorization;

      if (authHeader) {
        var match = authHeader.match(/^token (.*)$/i);
        if (match) {
          accessToken = match[1];
        }
      }
    }

    var parsed;
    if (!accessToken) {
      parsed = url.parse(requestUrl, true);
      accessToken = parsed.query.access_token;
    }

    var redisKey = getKey(requestUrl, accessToken);

    lookupEtagExpiry(redisKey, function(err, etagExpiry) {
      if (err) {
        logger.warn('http.cache error: ' + err, { exception: err});
        /* Continue with the request regardless */
      }

      if (etagExpiry) {
        var fresh = etagExpiry.expiry && etagExpiry.expiry >= Date.now();

        if (fresh) {
          return lookupContent(redisKey, function(err2, cachedContent) {
            if (err2) {
              logger.warn('Error looking up cache content: ' + err2, { exception: err2 });
            }

            if (err2 || !cachedContent) return makeRequest(requestUrl, accessToken, options, redisKey, null, callback);

            return doSuccessCallback(options, cachedContent, function(err, _response, _body) {
              if (err) {
                logger.warn('Error parsing cache content: ' + err, { exception: err });
                /* Make the request again */
                return makeRequest(requestUrl, accessToken, options, redisKey, null, callback);
              }

              return callback(null, _response, _body);
            });
          });
        }
      }

      return makeRequest(requestUrl, accessToken, options, redisKey, etagExpiry, callback);

    });

  };
};

