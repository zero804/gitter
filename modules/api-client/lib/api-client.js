'use strict';
/**
 * API Client
 *
 * This is a basic API client for communicating with the Gitter server.
 *
 * Basic Use
 * ------------
 *
 * The basic form of requests is:
 * apiClient.operation(url, data, options) -> $.Deferrer
 *
 * apiClient.get('/v1/eyeballs', data, options)
 * apiClient.post('/v1/eyeballs', data, options)
 * apiClient.put('/v1/eyeballs', data, options)
 * apiClient.patch('/v1/eyeballs', data, options)
 * apiClient.delete('/v1/eyeballs', data, options)
 *
 * Note that you should not include /api/ in your URL.
 *
 * Advanced usage
 * ---------------
 * apiClient.user.post('/collapsedItems', data, options)
 * apiClient.user.delete('/collapsedItems', data, options)
 *
 * These operations will use the current user resource as their root,
 *
 * The sub-resources available are:
 *
 * Sub Resource       | Root Resource
 * apiClient.user     | /v1/user/:userId
 * apiClient.userRoom | /v1/rooms/:roomId/user/:userId
 * apiClient.room     | /v1/rooms/:roomId
 *
 * Example
 * -------
 * Send a message to the current room:
 *
 * apiClient.room.post('/chatMessages', { text: 'hello from api client' })
 *   .then(function(response) {
 *     window.alert('I did a post.');
 *   })
 *   .catch(function(err) {
 *     window.alert('I am a failure: ' + err.status);
 *   })
 */
var Promise = require('bluebird');
var $ = require('jquery');
var _ = require('lodash');
var debug = require('debug-proxy')('app:api-client');
var urlJoin = require('url-join');


/* @const */
var DEFAULT_TIMEOUT = 60 * 1000;

/* @const */
var JSON_MIME_TYPE = 'application/json';

/* @const */
var GET_DEFAULTS = {
  timeout: DEFAULT_TIMEOUT,
  dataType: 'json'
};

/* @const */
var POST_DEFAULTS = {
  timeout: DEFAULT_TIMEOUT,
  dataType: 'json',
  contentType: JSON_MIME_TYPE,
};

/* @const */
var OPERATIONS = [
  ['get', GET_DEFAULTS],
  ['post', POST_DEFAULTS],
  ['patch', POST_DEFAULTS],
  ['put', POST_DEFAULTS],
  ['delete', POST_DEFAULTS]
];

function makeUrl(baseUrlFunction, url) {
  if(!url) url = '';

  if(!baseUrlFunction) {
    return url;
  }

  return baseUrlFunction()
    .then(function(baseUrl) {
      return urlJoin(baseUrl, url);
    });
}

function operation(fullUrlFunction, baseUrlFunction, method, defaultOptions, url, data, options) {
  options = _.extend({}, defaultOptions, options);
  var config = this.config;

  // If we're doing a DELETE but have no data, unset the contentType
  if((method === 'delete' || method === 'put') && !data) {
    delete options.contentType;
  }

  var dataSerialized;
  if(options.contentType === JSON_MIME_TYPE) {
    dataSerialized = JSON.stringify(data);
  } else {
    // JQuery will serialize to form data for us
    dataSerialized = data;
  }

  return Promise.try(function() {
      return config.getAccessToken();
    })
    .then(function(accessToken) {

      var promise = new Promise(function(resolve, reject) {
        var headers = {};

        if (accessToken) {
          headers['x-access-token'] = accessToken;
        }

        var getFullUrlPromise = fullUrlFunction(baseUrlFunction, url);

        function makeError(jqXhr, textStatus, errorThrown) {
          var json = jqXhr.responseJSON;
          var friendlyMessage = json && (json.message || json.error);

          var e = new Error(friendlyMessage || errorThrown || textStatus || 'AJAX error');
          e.url = fullUrl;
          e.friendlyMessage = friendlyMessage;
          e.response = json;
          e.method = method;
          e.status = jqXhr.status;
          e.statusText = jqXhr.statusText;
          return e;
        }

        getFullUrlPromise.then(function(fullUrl) {
          debug('%s: %s', method, fullUrl);
          // TODO: drop jquery `ajax`
          $.ajax({
            url: fullUrl,
            contentType: options.contentType,
            dataType: options.dataType,
            type: method,
            global: options.global,
            data: dataSerialized,
            timeout: options.timeout,
            async: options.async,
            headers: headers,
            success: function(data, textStatus, xhr) {
              var status = xhr.status;
              if (status >= 400 && status !== 1223) {

                var e = new Error(textStatus);
                e.status = status;
                return reject(makeError(xhr, textStatus, 'HTTP Status ' + status));
              }

              resolve(data);
            },
            error: function(xhr, textStatus, errorThrown) {
              return reject(makeError(xhr, textStatus, errorThrown));
            }
          });
        });
      });

      if(options.global) {
        promise.catch(function(err) {
          /* Asyncronously notify */
          if(config.onApiError) {
            config.onApiError(err.status, err.statusText, err.method, err.url);
          } else {
            throw err;
          }
        });
      }

      return promise;
    });

}



function getClient(fullUrlFunction, uriFunction) {
  var config = this.config;
  uriFunction = Promise.method(uriFunction || function() {
    return '';
  }).bind(this);

  var baseUrlFunction = function() {
    return uriFunction()
      .then(function(uri) {
        return urlJoin(config.baseUrl, uri);
      });
  };

  return OPERATIONS
    .reduce(function(memo, descriptor) {
      var method = descriptor[0];
      var defaultOptions = descriptor[1];

      memo[method] = operation.bind(this, fullUrlFunction, baseUrlFunction, method, defaultOptions);
      return memo;
    }.bind(this), {
      uri: function(relativeUrl) {
        return Promise.try(function() {
            return uriFunction();
          })
          .then(function(uri) {
            return urlJoin(uri, relativeUrl);
          });
      },
      url: Promise.method(function(relativeUrl) {
        return fullUrlFunction(baseUrlFunction, relativeUrl);
      }),
      channel: Promise.method(function(relativeUrl) {
        return makeUrl(baseUrlFunction, relativeUrl);
      }),
      // TODO: This needs to be sync for backbone collections, hmmmm
      // http://stackoverflow.com/q/32998480/796832
      channelGenerator: Promise.method(function(relativeUrl) {
        return function() {
          return makeUrl(baseUrlFunction, relativeUrl);
        };
      })
    });
}

var client = {
  config: {
    baseUrl: '',
    getAccessToken: null,
    getUserId: null,
    getTroupeId: null,
    onApiError: null
  }
};

module.exports = _.extend(client, getClient.bind(client)(makeUrl), {
  user: getClient.bind(client)(makeUrl, function() {
    var config = this.config;
    return Promise.try(function() {
        return config.getUserId();
      })
      .then(function(userId) {
        return urlJoin('/v1/user/', userId);
      });
  }.bind(client)),
  room: getClient.bind(client)(makeUrl, function() {
    var config = this.config;
    return Promise.try(function() {
        return config.getTroupeId();
      })
      .then(function(troupeId) {
        return urlJoin('/v1/rooms/', troupeId);
      });
  }.bind(client)),
  userRoom: getClient.bind(client)(makeUrl, function() {
    var config = this.config;
    return Promise.try(function() {
        return [
          config.getUserId(),
          config.getTroupeId()
        ]
      })
      .spread(function(userId, troupeId) {
        return urlJoin('/v1/user/', userId, '/rooms/', troupeId);
      });
  }.bind(client)),
  priv: getClient.bind(client)(makeUrl, function() {
    return urlJoin('/private');
  }.bind(client)),
  web: getClient.bind(client)(makeUrl)
});
