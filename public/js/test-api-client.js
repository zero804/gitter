'use strict';

var _ = require('lodash');
var context = require('./utils/context');
var appEvents = require('./utils/appevents');
var apiClient = require('gitter-web-api-client');


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

function handleApiError(status, statusText, method, url) {
  var route = findRouteForUrl(url);

  if(statusText === 'error' && status === 404) {
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


apiClient.config = _.extend(apiClient.config, {
  getAccessToken: context.getAccessToken,
  getUserId: context.getUserId,
  getTroupeId: context.getTroupeId,
  onApiError: handleApiError
});


apiClient.room.get('/chatMessages')
  .then(function(messages) {
    console.log('messages', messages);
  })
  .catch(function(err) {
    console.log('err', err, err.stack);
  });
