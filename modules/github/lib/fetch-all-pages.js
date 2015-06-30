/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var parseLinks = require('parse-links');
var url        = require('url');
var lazy       = require('lazy.js');
var Q          = require('q');

function updatePerPage(options) {
  if(options.method !== 'GET' && options.method !== undefined) return;

  /* Only GET requests thanks */
  var uri = options.uri || options.url;
  if(typeof uri !== 'object') {
    uri = url.parse(uri, true);
  }

  uri.query.per_page = 100;
  delete uri.search;
  uri = url.format(uri);

  if(options.uri) {
    options.uri = uri;
  } else if(options.url) {
    options.url = uri;
  }

  return options;
}

module.exports = exports = function(options, callback, request) {
  function subrequest(options) {
    var d = Q.defer();

    request(options, function (error, response, body) {
      if(error) return d.reject(error);
      // Reject bad responses
      if(response.statusCode >= 400) return d.reject('HTTP ' + response.statusCode);

      var bodyJson;
      try {
        bodyJson = JSON.parse(body);
      } catch(e) {
        return d.reject(e);
      }

      d.resolve(bodyJson);
    });

    return d.promise;
  }

  /* Allow clients to disable this */
  if (options.firstPageOnly) {
    return request(options, callback);
  }

  /* Always fetch 100 items per page */
  options = updatePerPage(options);

  request(options, function (error, response, body) {
    if(error) return callback(error, response, body);
    if(response.statusCode >= 400) return callback(error, response, body);

    var remaining;

    if(!response.headers.link) {
      return callback(error, response, body);
    }

    var firstPage;
    try {
      firstPage = JSON.parse(body);
    } catch(e) {
      return callback(e, response, body);
    }

    var links = parseLinks(response.headers.link);
    if(links.next && links.last) {
      var lastParsed = url.parse(links.last, true);
      var lastPage = parseInt(lastParsed.query.page, 10);

      if(lastPage > 1) {
        remaining = lastPage - 1;

        var promises = lazy.range(1, lastPage + 1).map(function(i) {
            if(i == 1) return firstPage;

            var uri = url.parse(links.last, true);
            delete uri.search;
            uri.query.page = i;

            var pageUrl = url.format(uri);

            var clonedOptions = lazy(options).assign({ uri: pageUrl }).toObject();

            return subrequest(clonedOptions);
          }).toArray();

        return Q.all(promises)
          .then(function(results) {
            var all = lazy(results).flatten().toArray();

            callback(null, response, all);
          })
          .catch(function(error) {
            callback(error);
          });
      }
    }

    return callback(error, response, body);
  });
};
