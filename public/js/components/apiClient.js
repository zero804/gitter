"use strict";
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
 * Note that altough the client returns a deferred, it will
 * in future return a promise.
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
 *   .fail(function(xhr) {
 *     window.alert('I am a failure: ' + xhr.status);
 *   })
 */
var $ = require('jquery');
var context = require('utils/context');
var appEvents = require('utils/appevents');

module.exports = (function() {


  /* @const */
  var DEFAULT_TIMEOUT = 60 * 1000;

  /* @const */
  var JSON_MIME_TYPE = "application/json";

  /* @const */
  var GET_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json"
  };

  /* @const */
  var POST_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json",
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

  function makeApiUrl(baseUrlFunction, url) {
    if(!url) url = '';

    var baseUrl = context.env('apiBasePath');

    if(!baseUrlFunction) {
      return baseUrl + url;
    }

    return baseUrl + baseUrlFunction() + url;
  }

  function makeWebUrl(baseUrlFunction, url) {
    if(!url) url = '';

    if(!baseUrlFunction) {
      return url;
    }

    return baseUrlFunction() + url;
  }

  function makeChannel(baseUrlFunction, url) {
    if(!url) url = '';

    if(!baseUrlFunction) {
      return url;
    }

    return baseUrlFunction() + url;
  }

  function accessTokenDeferred() {
    var deferred = $.Deferred();

    context.getAccessToken(function(accessToken) {
      deferred.resolve(accessToken);
    });

    return deferred;
  }

  // TODO return a proper promise instead of a $.Deferred
  function operation(fullUrlFunction, baseUrlFunction, method, defaultOptions, url, data, options) {
    options = defaults(options, defaultOptions);

    // If we're doing a DELETE but have no data, unset the contentType
    if(method === 'delete' && !data) {
      delete options.contentType;
    }

    var dataSerialized;
    if(options.contentType === JSON_MIME_TYPE) {
      dataSerialized = JSON.stringify(data);
    } else {
      // JQuery will serialize to form data for us
      dataSerialized = data;
    }

    return accessTokenDeferred()
      .then(function(accessToken) {
        var fullUrl = fullUrlFunction(baseUrlFunction, url);

        var deferred = $.ajax({
          url: fullUrl,
          contentType: options.contentType,
          dataType: options.dataType,
          type: method,
          global: options.global,
          data: dataSerialized,
          context: options.context, // NB: deprecated: cant use with real promises
          timeout: options.timeout,
          async: options.async,
          headers: {
            'x-access-token': accessToken
          }
        });

        /* Don't add this to the 'promise' chain */
        deferred.fail(function(xhr) {
          if(options.global) {
            /* Asyncronously notify */
            handleApiError(xhr, method, fullUrl);
          }
        });

        return deferred;
      });

  }

  // Minimize the number of different errors which are actually the same
  // This is useful for Sentry http://app.getsentry.com
  var routes = {
    githubIssues: /^\/api\/private\/gh\/[^/]+\/[^/]+\/issues/,
    githubUsers: /^\/api\/private\/gh\/users\//,
  };

  function findRouteForUrl(url) {
    var r = Object.keys(routes);
    for(var i = 0; i < r.length; i++) {
      var routeName = r[i];
      var re = routes[routeName];

      if(re.test(url)) return routeName;
    }
  }

  function handleApiError(xhr, method, url) {
    var status = xhr.status;

    var route = findRouteForUrl(url);

    if(xhr.statusText == "error" && status === 404) {
      /* Unreachable server */
      appEvents.trigger('bugreport', 'ajaxError: unreachable: '+ method + ' ' + (route || url), {
        tags: {
          type: 'ajax',
          subtype: 'unreachable',
          url: url
        }
      });

    } else if(status < 500) {
      // 400 errors are the problem of the ajax caller, not the global handler
      return;

    } else {
      appEvents.trigger('bugreport', 'ajaxError: HTTP ' + status + ' on ' + method + ' ' + (route || url), {
        tags: {
          type: 'ajax',
          subtype: 'HTTP' + status,
          url: url
        }
      });
    }

    appEvents.trigger('ajaxError');
  }


  // Util functions
  function defaults(options, defaultValues) {
    if(!options) options = {};
    Object.keys(defaultValues).forEach(function(key) {
      if(options[key] === undefined) {
        // Only using a shallow clone for simplicity
        options[key] = defaultValues[key];
      }
    });
    return options;
  }

  function getClient(fullUrlFunction, baseUrlFunction) {
    return OPERATIONS
      .reduce(function(memo, descriptor) {
        var method = descriptor[0];
        var defaultOptions = descriptor[1];

        memo[method] = operation.bind(memo, fullUrlFunction, baseUrlFunction, method, defaultOptions);
        return memo;
      }, {
        url: function(relativeUrl) {
          return fullUrlFunction(baseUrlFunction, relativeUrl);
        },
        channel: function(relativeUrl) {
          return makeChannel(baseUrlFunction, relativeUrl);
        },
        channelGenerator: function(relativeUrl) {
          return function() {
            return makeChannel(baseUrlFunction, relativeUrl);
          };
        }
      });
  }

  return defaults(getClient(makeApiUrl), {
    user: getClient(makeApiUrl, function() {
      return '/v1/user/' + context.getUserId();
    }),
    room: getClient(makeApiUrl, function() {
      return '/v1/rooms/' + context.getTroupeId();
    }),
    userRoom: getClient(makeApiUrl, function() {
      return '/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId();
    }),
    priv: getClient(makeApiUrl, function() {
      return '/private';
    }),
    web: getClient(makeWebUrl)
  });


})();
