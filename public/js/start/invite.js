/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery'
], function($) {
  "use strict";

  return function() {
    var hasInvitedSomeone = false;
    var troupeId = window.location.hash.replace('#', '');

    $('.trpStartInviteButton').on('click', function() {
      var data = {
        email: $('input').val()
      };
      $.post('/troupes/'+troupeId+'/invites', data, function() {
        hasInvitedSomeone = true;
      });
    });

    $('#next-button').on('click', function() {
      if(hasInvitedSomeone) {
        window.location.href = 'finish';
      }
    });

  };
});
