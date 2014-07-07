define([
  'jquery',
  '../utils/context',
  'log!native-context'
], function($, context, log) {
  "use strict";

  $(document).on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log('Unable to update application cache: ' + e, e);
    }
  });

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
        log('Unknown context');
        // Unfortunately older clients will crash without four parameters
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
