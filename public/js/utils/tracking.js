/*jshint unused:true browser:true*/
define([
  'ga'
], function(_gaq) {

  if(!window.troupeTrackingId) {
    return {
      trackError: function() { console.log("Error!", arguments); }
    };
  }

  _gaq.push(['_setAccount', window.troupeTrackingId]);

  function trackPageView(routeName) {
    _gaq.push(['_trackEvent', 'Route', routeName]);
  }

  function trackError(message, file, line) {
    _gaq.push(['_trackEvent', 'Error', message, file, line]);
  }

  _gaq.push(['_setCustomVar',
      1,
      'userId',
      window.troupeContext.user.id,
      2 // Session level variable
   ]);

  _gaq.push(['_setCustomVar',
      2,
      'troupeUri',
      window.troupeContext.troupe.uri,
      3 // Page level variable
   ]);

  _gaq.push(['_trackPageview']);

  $(document).on('track', function(e, routeName) {
    trackPageView(routeName);
  });

  return {
    trackError: trackError
  };
});



