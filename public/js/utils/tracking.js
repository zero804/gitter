define([
  'ga',
  'router'
], function(_gaq, appRouter) {

  _gaq.push(['_setAccount', 'UA-34596351-1']);

  function trackPageView() {
    var hash = location.hash;
    if(hash) {
      hash = hash.replace(/\/.*$/,"/");
    }
    _gaq.push(['_trackPageview', "app" + hash]);
  }

  trackPageView();

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

  appRouter.bind("all",function(route, router) {
    trackPageView();
  });
});