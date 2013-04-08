/*jshint unused:true, browser:true*/
define([
  'jquery',
  './realtime',
  'utils/log'
], function($, realtime, log) {
  "use strict";



  function send(value) {
    if(!realtime._clientId) {
      return;
    }

    $.ajax({
      url: '/api/v1/eyeballs',
      data: {
        socketId: realtime._clientId,
        on: value
      },
      type: "POST",
      success: function(/*data*/) {
      }
    });
  }

  $(window).on('blur', function() {
    log('blur');
    send(0);
  });

  $(window).on('focus', function() {
    log('focus');
    send(1);
  });

});