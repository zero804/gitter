/*jshint unused:true browser:true*/
define([
  'ga'
], function(_gaq) {

  _gaq.push(['_setAccount', 'UA-34596351-1']);

  function trackPageView(routeName) {
    _gaq.push(['_trackPageview', routeName]);
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

  $(document).on('track', function(e, routeName) {
    trackPageView(routeName);
  });

});
