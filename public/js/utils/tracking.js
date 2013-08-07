/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'ga',
  'utils/context',
  './mixpanel' // No ref
], function($, _gaq, context) {
  "use strict";
  var trackGoogle = !!window.troupeTrackingId;
  if(window.troupeTrackingId) {
    _gaq.push(['_setAccount', window.troupeTrackingId]);
    _gaq.push(['_setAllowAnchor',true]);
  }

  function trackPageView(routeName) {
    if(window.mixpanel) {
      window.mixpanel.track('pageView', { pageName: routeName });
    }

    _gaq.push(['_trackEvent', 'Route', routeName]);
  }

  function trackError(message, file, line) {
    if(window.mixpanel) {
      window.mixpanel.track('jserror', { message: message, file: file, line: line } );
    }

    _gaq.push(['_trackEvent', 'Error', message, file, line]);
  }

  var userId = context.getUserId()
  if (userId) {
    _gaq.push(['_setCustomVar',
        1,
        'userId',
        context.getUserId(),
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

  $(document).on('track', function(e, routeName) {
    trackPageView(routeName);
  });

  return {
    trackError: trackError
  };
});



