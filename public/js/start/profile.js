/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/profile/profileView',
  'views/signup/usernameView'
], function($, profile, UsernameView) {
  "use strict";

  return function() {
    var profileView = new profile.View({
      el: $('.trpStartContent')
    });
    profileView.afterRender();

    new UsernameView({
      el: $('.trpStartContent')
    });

    $('#next-button').on('click', function() {
      profileView.onFormSubmit();
    });

    $('#username').on('focus', function() {
      $('.trpStartHelp').show();
    });

    profileView.on('submit.success', function() {
      document.location.href = 'create';
    });

  };

});