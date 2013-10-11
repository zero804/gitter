/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/profile/profileView',
  'views/signup/usernameView'
], function($, profile, UsernameView) {
  "use strict";

  function showPasswordError() {
    $('#password-help').hide();
    $('#password-error').show();
    $('#password-area .help').css({ 'opacity' : 1 });
  }

  function hidePasswordError() {
    $('#password-error').hide();
    $('#password-help').show();
    $('#password-area .help').css({ 'opacity' : 0.8 });
  }

  function showNameError() {
    $('#name-error').show();
    $('#displayname-area .help').css({ 'opacity' : 1 });
  }

  function hideNameError() {
    $('#name-error').hide();
    $('#displayname-area .help').css({ 'opacity' : 0.8 });
  }

  function showUsernameError() {
    $('.tip-message, .not-valid-message').hide();
    $('#username-error').show();
    $('#username-area .help').css({ 'opacity' : 1 });
  }

  function hideUsernameError() {
    $('.tip-message').show();
    $('#username-error').hide();
    $('#username-area .help').css({ 'opacity' : 0.8 });
  }

  return function() {
    var profileView = new profile.View({
      el: $('.trpStartContent')
    });
    profileView.onError = function() {
      console.log('ERROR!', arguments);
    };
    profileView.afterRender();

    new UsernameView({
      el: $('.trpStartContent')
    });

    $('#next-button').on('click', function() {
      showPasswordError();
      showNameError();
      showUsernameError();
      profileView.onFormSubmit();
    });

    $('#password').on('focus' , function() {
      hidePasswordError();
    });

    $('#displayName').on('focus' , function() {
      hideNameError();
    });

    $('#username').on('focus' , function() {
      hideUsernameError();
    });

    $('#username').on('focus', function() {
      $('.trpStartHelp').show();
    });

    profileView.on('submit.success', function() {
      document.location.href = 'create';
    });

  };

});