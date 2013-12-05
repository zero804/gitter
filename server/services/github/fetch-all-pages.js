/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var parseLinks = require('parse-links');
var url = require('url');
var lazy = require('lazy.js');
var winston = require('winston');

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

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    /* Don't do multiple callbacks */
    function callbackOnce(error, response, body) {
      if(callback) {
        var temp = callback;
        callback = null;
        temp(error, response, body);
      }
    }

    /* Always fetch 100 items per page */
    options = updatePerPage(options);

    request(options, function (error, response, body) {
      if(error) return callbackOnce(error, response, body);

      var remaining;

      function subrequestComplete(pageNumber) {
        return function (error, response, body) {
          if(error) return callbackOnce(error, response, body);

          pages[pageNumber - 1] = JSON.parse(body);

          if(!--remaining) {
            var all =lazy(pages).flatten().toArray();
            callbackOnce(error, response, all);
          }
        };
      }

      if(!response.headers.link) {
        return callback(error, response, body);
      }

      var links = parseLinks(response.headers.link);
      if(links.next && links.last) {
        var lastParsed = url.parse(links.last, true);
        var lastPage = parseInt(lastParsed.query.page, 10);

        if(lastPage > 1) {
          remaining = lastPage - 1;

          var pages = [JSON.parse(body)];

          winston.info('Fetching another ' + (lastPage - 1)  + ' pages of results');

          for(var i = 2; i <= lastPage; i++) {
            var newQuery = lazy(lastParsed.query).assign({ page: i }).toObject();
            var newUri = lazy(lastParsed).assign({ query: newQuery }).toObject();
            var pageUrl = url.format(newUri);
            var newOpts = lazy(options).assign({ url: pageUrl }).toObject();
            request(newOpts, subrequestComplete(i));
          }

        }

        return;
      }

      return callback(error, response, body);
    });
  };
};