"use strict";
var context = require('../utils/context');
var log = require('utils/log');
var appEvents = require('../utils/appevents');

module.exports = (function() {

  appEvents.on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status === window.applicationCache.IDLE) {
        log.info('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log.info('Unable to update application cache: ' + e, e);
    }
  });

  var cordova = window.cordova;
  if(!cordova) {
    log.info('Cordova not detected. Quietly ignoring native-context updates');
    return;
  }

  log.info('Cordova detected, calling TroupeContext.updateContext');



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
    var page = context.env('page');
    switch(page) {
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
        params.push(oneToOne ? "oneToOne": "troupe", troupe.id, page, troupe.get('name'));
        break;

      default:
        log.info('Unknown context');
        // Unfortunately older clients will crash without four parameters
        params.push(null, null, null);
    }
    log.info('Pushing context: ' + params.join(','));

    try {
      cordova.exec(function() {}, function() {}, "TroupeContext", "updateContext", params);
    } catch(e) {
      log.info('Plugin failure', e);
    }

  }


})();

