/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/appevents',
  'log!ajax-errors'
], function($, appEvents, log){
  "use strict";

  $(document).ajaxError(function(ev, jqxhr, settings) {

    if(jqxhr.statusText == "error" && jqxhr.status === 404) {
      log('unreachable: ' + settings.url);
      /* Unreachable server */
      appEvents.trigger('bugreport', 'ajaxError: unreachable: '+ settings.type + ' ' + settings.url);

    } else if(jqxhr.status < 500) {
      // 400 errors are the problem of the ajax caller, not the global handler
      return;

    } else {
      log('ajaxError: HTTP ' + jqxhr.status + ' on ' + settings.url);
      appEvents.trigger('bugreport', 'ajaxError: HTTP ' + jqxhr.status + ' on ' + settings.type + ' ' + settings.url);
    }

    appEvents.trigger('ajaxError');
  });

});
