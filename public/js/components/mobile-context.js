/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  '../utils/context',
  'log!mobile-context'
], function(context, log) {
  "use strict";

  var cordova = window.cordova;

  if(cordova) {
    log('Cordova detected, calling TroupeContext.updateContext');

    document.addEventListener("deviceready", function() {
      var c = context();
      var params = [window.location.href];

      if(c.inUserhome) {
        params.push("home", null, null);

      } else if(c.troupe) {
        var t = c.troupe;
        params.push(t.oneToOne ? "oneToOne": "troupe", context.getTroupeId(), c.mobilePage);
      }

      try {
        cordova.exec(function() {}, function() {}, "TroupeContext", "updateContext", params);
      } catch(e) {
        log('Plugin failure', e);
      }

    }, false);

  }



});