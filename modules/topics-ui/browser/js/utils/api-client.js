import clientEnv from 'gitter-client-env';
import {getAccessToken} from '../stores/access-token-store';
import {getCurrentUser} from '../stores/current-user-store';
import ApiClient from 'gitter-web-api-client';


// Minimize the number of different errors which are actually the same
// This is useful for Sentry http://app.getsentry.com
const routes = {
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
    window.console.log('bugreport', 'ajaxError: unreachable: '+ method + ' ' + (route || url), {
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
    window.console.log('bugreport', 'ajaxError: HTTP ' + status + ' on ' + method + ' ' + (route || url), {
      tags: {
        type: 'ajax',
        subtype: 'HTTP' + status,
        url: url
      }
    });
  }
}


var apiClient = new ApiClient({
  baseUrl: clientEnv['apiBasePath'],
  accessToken: getAccessToken(),
  getUserId: getCurrentUser().id,
  getTroupeId: function() {
    throw new Error('api-client in topics trying to grab the current room `getTroupeId` when there is not an associated room');
  }
});

apiClient.on('error', function(err) {
  handleApiError(err.status, err.statusText, err.method, err.url);
});

export default apiClient;
