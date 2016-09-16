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

  return baseUrlFunction() + url;
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
    .bind(this)
    .then(function(accessToken) {

      var promise = new Promise(function(resolve, reject) {
        var headers = {};

        if (accessToken) {
          headers['x-access-token'] = accessToken;
        }

        var fullUrl = fullUrlFunction(baseUrlFunction, url);

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

      if(options.global) {
        promise.catch(function(err) {
          /* Asyncronously notify */
          this.config.onApiError(err.status, err.statusText, err.method, err.url);
        }.bind(this));
      }

      return promise;
    });

}



function getClient(fullUrlFunction, uriFunction) {
  var config = this.config;
  fullUrlFunction = fullUrlFunction.bind(this);
  uriFunction = (uriFunction || function() {
    return '';
  }).bind(this);

  var baseUrlFunction = function() {
    return config.baseUrl + uriFunction();
  };

  return OPERATIONS
    .reduce(function(memo, descriptor) {
      var method = descriptor[0];
      var defaultOptions = descriptor[1];

      memo[method] = operation.bind(this, fullUrlFunction, baseUrlFunction, method, defaultOptions);
      return memo;
    }.bind(this), {
      uri: function(relativeUrl) {
        return uriFunction() + relativeUrl;
      },
      url: function(relativeUrl) {
        return fullUrlFunction(baseUrlFunction, relativeUrl);
      },
      channel: function(relativeUrl) {
        return makeUrl(baseUrlFunction, relativeUrl);
      },
      channelGenerator: function(relativeUrl) {
        return function() {
          return makeUrl(baseUrlFunction, relativeUrl);
        }.bind(this);
      }
    });
}



module.exports = function() {
  var client = {
    config: {
      baseUrl: '',
      getAccessToken: function() { return ''; },
      getUserId: function() { return ''; },
      getTroupeId: function() { return ''; },
      onApiError: function() {}
    }
  };

  return _.extend(client, getClient.bind(client)(makeUrl), {
    user: getClient.bind(client)(makeUrl, function() {
      return '/v1/user/' + this.config.getUserId();
    }),
    room: getClient.bind(client)(makeUrl, function() {
      return '/v1/rooms/' + this.config.getTroupeId();
    }),
    userRoom: getClient.bind(client)(makeUrl, function() {
      return '/v1/user/' + this.config.getUserId() + '/rooms/' + this.config.getTroupeId();
    }),
    priv: getClient.bind(client)(makeUrl, function() {
      return '/private';
    }),
    web: getClient.bind(client)(makeUrl)
  });
}
