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
      sendContext();
      // TODO: listen for context change events!
      // context.on('troupe:change', sendContext);
    }, false);

  }

  // Communicates with the native app, giving it context
  function sendContext() {
    var c = context();
    var params = [window.location.href];

    if(c.inUserhome) {
      params.push("home", null, null);
    } else if(context.getTroupeId()) {
      var t = context.getTroupe();
      // TODO: fix this - deal with late loading of troupe
      params.push(t.oneToOne ? "oneToOne": "troupe", context.getTroupeId(), c.mobilePage);
    } else {
      log('Unknown context');
      // Unfortunately older clients will crash without the correct
      // number of parameters
      params.push(null, null, null);
    }

    try {
      cordova.exec(function() {}, function() {}, "TroupeContext", "updateContext", params);
    } catch(e) {
      log('Plugin failure', e);
    }
  }


});