require([
  'jquery',
  'log!login',
  'retina'],
  function($, log) {
    "use strict";

    function getDefaultEmail() {
      try {
        if(window.localStorage) {
          return window.localStorage.defaultTroupeEmail;
        }
      } catch(err) {
        log('Unable to access localStorage', err);
      }
    }

    function setDefaultEmail(value) {
      if(window.localStorage) {
        try {
          window.localStorage.defaultTroupeEmail = value;
        } catch(err) {
          log('Browser rejected attempted to use localStorage', err);
        }
      }

    }

    var defaultEmail = getDefaultEmail();
    if(defaultEmail) $('#email').val(defaultEmail);

    $('#button-existing-users-login').on('click', function(e) {
      e.preventDefault();
      submitForm();
    });

    $('#password, #email').on('change', function() {
      log("Password blur");
      hideLoginFailure();
    });

    $('#password, #email').on('click', function() {
      log("Password blur");
      hideLoginFailure();
    });

    $("#loginform").submit(function(e) {
      e.preventDefault();
      setDefaultEmail($('#email').val());

      $("#password").blur();
      submitForm();
    });

    $(".button-request-new-password").on('click', function() {
      sendReset({
        success: function() {
          hideLoginFailure();
          showResetSuccess();
        },
        error: function() {
          hideLoginFailure();
          showResetFailure();
        }
      });
    });

    function showLoginFailure() {
      $('#login-failure').show().animate({
        bottom: '0px'
      }, 350);
    }

    function hideLoginFailure() {
      $('.mtrpLoginFailure').hide().animate( {
        bottom: '-200px'
      }, 350);
    }

    function showResetFailure() {
      $('#resetpwd-failure').show().animate({
        bottom: '0px'
      }, 350);
    }

    function showResetSuccess() {
      $('#resetpwd-confirm').show().animate({
        bottom: '0px'
      }, 350);
    }

    function submitForm() {
      hideLoginFailure();
      var form = $('#loginform');

      $.ajax({
        url: "/login",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        error: function(/*jqXHR, textStatus, errorThrown*/) {
          log("Error");
          showLoginFailure();

        },
        success: function(data) {
          if(data.failed) {
            log("No it actually failed");
            showLoginFailure();
            return;
          }

          window.location.href = data.redirectTo;
        }
      });
    }

    function sendReset(options) {
      var form = $('form#loginform');
      $.ajax({
        url: "/reset",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.failed) {
            options.error();
          }
          else {
            options.success();
          }
        }
      });

    }


});

