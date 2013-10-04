/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'ga',
  'utils/context',
  'utils/appevents',
  './mixpanel', // No ref
  'optimizely'
], function(_gaq, context, appEvents) {
  "use strict";
  var trackingId = context.env('googleTrackingId');
  if(trackingId) {
    _gaq.push(['_setAccount', trackingId]);
    _gaq.push(['_setAllowAnchor',true]);

    var userId = context.getUserId();
    if (userId) {
      _gaq.push(['_setCustomVar',
          1,
          'userId',
          userId,
          2 // Session level variable
       ]);
    }

    _gaq.push(['_trackPageview']);
    _gaq.push(function() {
      window.setTimeout(function() {
        var hash = "" + window.location.hash;
        try {
          hash = hash.replace(/\butm_\w+=(\+|\w+|%\w\w|\-)*&?/g, "");
        } catch(e) {
        }

        window.location.hash = hash;
      }, 10);
    });

  }

  function trackPageView(routeName) {
    if(window.mixpanel) {
      window.mixpanel.track('pageView', { pageName: routeName });
    }

    if(trackingId) {
      _gaq.push(['_trackEvent', 'Route', routeName]);
    }

  }

  function trackError(message, file, line) {
    if(window.mixpanel) {
      window.mixpanel.track('jserror', { message: message, file: file, line: line } );
    }

    if(trackingId) {
      _gaq.push(['_trackEvent', 'Error', message, file, line]);
    }
  }

  appEvents.on('track', function(routeName) {
    trackPageView(routeName);
  });

  return {
    trackError: trackError
  };
});



