/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'notyfy',
  './realtime'
], function($, _ , notyfy, realtime){
  "use strict";

  var defaults = $.notyfy.defaults;
  defaults.layout = 'bottom';
  defaults.timeout = 3000;
  defaults.dismissQueue = true; // If you want to use queue feature set this true

  realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
    console.dir(message);
    notyfy({
      text: 'notyfy - Yet another jQuery notification plugin',
      type: 'information'
    });
  });

});
