/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'utils/appevents',
  './mixpanel', // No ref
  'optimizely'
], function(context, appEvents) {
  "use strict";
  var trackingId = context.env('googleTrackingId');
  var ga;
  if(trackingId) {
        
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga = window.ga;

    ga('create', 'UA-45918290-1', 'gitter.im');
    ga('send', 'pageview');

  }

  var goSquaredTrackingId = context.env('goSquaredTrackingId');
  var user = context.getUser();
  if(goSquaredTrackingId) {
    var GoSquared = window.GoSquared = {};
    GoSquared.acct = goSquaredTrackingId;

    if (user.username)
    {
      GoSquared.UserName = user.username;
      GoSquared.Visitor = {
        id: user.id,
        displayName: user.displayName,
        email: user.email
      };
    }

    (function(w){
        w._gstc_lt = +new Date;
        var d = document, g = d.createElement("script");
        g.type = "text/javascript";
        g.src = "//d1l6p2sc9645hc.cloudfront.net/tracker.js";
        var s = d.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(g, s);
    })(window);
  }

  function trackPageView(routeName) {
    if(window.mixpanel) {
      window.mixpanel.track('pageView', { pageName: routeName });
    }

    if(trackingId) {
      ga('send', 'event', 'route', routeName);
    }

  }

  function trackError(message, file, line) {
    if(window.mixpanel) {
      window.mixpanel.track('jserror', { message: message, file: file, line: line } );
    }

    if(trackingId) {
      ga('send', 'event', 'error', message, file, line);
    }
  }

  appEvents.on('track', function(routeName) {
    trackPageView(routeName);
  });

  return {
    trackError: trackError
  };
});



