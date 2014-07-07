define([
  'jquery',
  'utils/appevents',
  'log!ajax-errors'
], function($, appEvents, log){
  "use strict";

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

  $(document).ajaxError(function(ev, jqxhr, settings) {
    var url = settings.url;
    var method = settings.type;
    var status = jqxhr.status;

    if(!url) return;

    if(url.indexOf('/') !== 0 && !url.match(/https?:\/\/[\w.-_]*gitter.im\//)) {
      return;
    }

    var route = findRouteForUrl(url);

    if(jqxhr.statusText == "error" && status === 404) {
      log('unreachable: ' + url);
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
      log('ajaxError: HTTP ' + status + ' on ' + url);
      appEvents.trigger('bugreport', 'ajaxError: HTTP ' + status + ' on ' + method + ' ' + (route || url), {
        tags: {
          type: 'ajax',
          subtype: 'HTTP' + status,
          url: url
        }
      });
    }

    appEvents.trigger('ajaxError');
  });

});
