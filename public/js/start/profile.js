/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/profile/profileView',
  'views/signup/usernameView',
  'views/base'
], function($, profile, UsernameView, TroupeViews) {
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
    profileView.onError = function(errorMap) {
      if(errorMap.displayName) {
        showNameError();
      } else {
        hideNameError();
      }
      if(errorMap.username) {
        showUsernameError();
      } else {
        hideUsernameError();
      }
      if(errorMap.password) {
        showPasswordError();
      } else {
        hidePasswordError();
      }
    };
    profileView.onFormSubmitFailure = function(err) {
      hideNameError();
      hideUsernameError();
      hidePasswordError();

      if(err.status === 400) {
        var errors = err.responseJSON.errors;
        if(errors.displayName) {
          showNameError();
        }
        if(errors.username) {
          showUsernameError();
        }
        if(errors.password) {
          showPasswordError();
        }
      } else if(err.status === 409 && err.responseJSON.usernameConflict) {
        showUsernameError();
      } else {
        var modal = new TroupeViews.ConfirmationModal({
          title: "Submit Failed",
          body: err.responseText,
          menuItems: [{ text: "OK" }]
        });
        modal.on('menuItemClicked', function() {
          modal.hide();
        });
        modal.show();
      }
    };

    profileView.afterRender();

    new UsernameView({
      el: $('.trpStartContent')
    });

    $('#next-button, .hidden-iphone-submit-button').on('click', function() {
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