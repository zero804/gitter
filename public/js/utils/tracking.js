"use strict";

var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var appEvents = require('utils/appevents');
var splitTests = require('gitter-web-split-tests');
var _ = require('underscore');

require('./mixpanel');

module.exports = (function() {


  var trackingId = clientEnv['googleTrackingId'];
  var trackingDomain = clientEnv['googleTrackingDomain'] || 'gitter.im'; // Remove this default 23/10/2014;
  var ga;
  var gosquared;

  if(trackingId) {
    /* eslint-disable */
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    /* eslint-enable */

    ga = window.ga;

    ga('create', trackingId, trackingDomain);
    ga('send', 'pageview');
  }

  var goSquaredTrackingId = clientEnv['goSquaredTrackingId'];
  var user = context.getUser();

  if(goSquaredTrackingId) {
    gosquared = window.GoSquared = {};
    gosquared.acct = goSquaredTrackingId;

    if (user.username)
    {
      gosquared.UserName = user.username;
      gosquared.Visitor = {
        id: user.id,
        displayName: user.displayName,
        email: user.email
      };
    }

    (function(w){
        w._gstc_lt = +new Date();
        var d = document, g = d.createElement("script");
        g.type = "text/javascript";
        g.src = "//d1l6p2sc9645hc.cloudfront.net/tracker.js";
        var s = d.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(g, s);
    })(window);
  }


  function trackPageView(routeName) {
    if (window.mixpanel && window.mixpanel.register) {

      if (context.getUserId())
        window.mixpanel.register({ userStatus: 'ACTIVE'});

      var isUserHome = '/home' === routeName;
      var authenticated = !!context.getUserId();
      var userAgent = window.navigator.userAgent;

      window.mixpanel.track('pageView', _.extend({
        pageName: routeName,
        authenticated: authenticated,
        isUserHome: isUserHome,
        isCommunityPage: context().isCommunityPage,
        userAgent: userAgent
      }, splitTests.listVariants()));
    }

    var gs = window._gs;
    if(gs) {
      gs('track');
    }

    // Removing this for now as it's affecting our bounce rate
    // if(trackingId) {
    //   ga('send', 'event', 'route', routeName);
    // }

  }

  function trackError(message, file, line) {
    // if(window.mixpanel && window.mixpanel.track) {
    //   window.mixpanel.track('jserror', { message: message, file: file, line: line } );
    // }

    if(trackingId) {
      ga('send', 'event', 'error', message, file, line);
    }
  }

  appEvents.on('track', function(routeName) {
    trackPageView(routeName);
  });

  appEvents.on('track-event', function(eventName, data) {
    if (window.mixpanel && window.mixpanel.track) {
      window.mixpanel.track(eventName, data);
    }
  });

  trackPageView(window.location.pathname);

  return {
    trackError: trackError
  };

})();
