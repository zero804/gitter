/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/appevents',
  'log!ajax-errors'
], function($, appEvents, log){
  "use strict";

  $(document).ajaxError(function(ev, jqxhr, settings) {
    var url = settings.url;
    var method = settings.type;
    var status = jqxhr.status;

    if(!url) return;

    if(url.indexOf('/') !== 0 && !url.match(/https?:\/\/[\w.-_]*gitter.im\//)) {
      return;
    }

    if(jqxhr.statusText == "error" && status === 404) {
      log('unreachable: ' + url);
      /* Unreachable server */
      appEvents.trigger('bugreport', 'ajaxError: unreachable: '+ method + ' ' + url, { tags: { type: 'ajax', subtype: 'unreachable' } });

    } else if(status < 500) {
      // 400 errors are the problem of the ajax caller, not the global handler
      return;

    } else {
      log('ajaxError: HTTP ' + status + ' on ' + url);
      appEvents.trigger('bugreport', 'ajaxError: HTTP ' + status + ' on ' + method + ' ' + url, { tags: { type: 'ajax', subtype: 'HTTP' + status } });
    }

    appEvents.trigger('ajaxError');
  });

});
