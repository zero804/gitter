/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  '../utils/context',
  'log!native-context'
], function(context, log) {
  "use strict";

  var cordova = window.cordova;
  if(!cordova) {
    log('Cordova not detected. Quietly ignoring native-context updates');
    return;
  }

  log('Cordova detected, calling TroupeContext.updateContext');

  document.addEventListener("deviceready", function() {
    var troupe = context.troupe();

    sendContext();
    troupe.on('change', sendContext);
    // TODO: listen for context change events!
    // context.on('troupe:change', sendContext);
  }, false);

  // Communicates with the native app, giving it context
  function sendContext() {
    var params = [window.location.href];

    switch(context.env('page')) {
      case 'home':
        params.push("home", null, null);
        break;
      case 'chat':
      case 'files':
      case 'mails':
      case 'people':
        var troupe = context.troupe();

        /* If the full troupe has not yet been loaded, wait for another update */
        if(!troupe.get('name')) return;
        var oneToOne = troupe.get('oneToOne');
        params.push(oneToOne ? "oneToOne": "troupe", troupe.id, context.env('mobilePage'));
        break;

      default:
        log('Unknown context');
        // Unfortunately older clients will crash without the correct
        // number of parameters
        params.push(null, null, null);
    }
    log('Pushing context: ' + params.join(','));

    try {
      cordova.exec(function() {}, function() {}, "TroupeContext", "updateContext", params);
    } catch(e) {
      log('Plugin failure', e);
    }

  }

});