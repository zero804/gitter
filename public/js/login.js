/*jshint unused:strict, browser:true */
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

    var leftPanelSpacing = (($(document).width() - 320) / 2) + 320;

    $('#panel-signup').css('left', leftPanelSpacing + 'px').show();

    $('#button-signup').on('click', function() {
      $('#panel-signup, #panel-login').animate( {
        left: '-=' + leftPanelSpacing + 'px'
      }, 350);
    });

    $('#button-back').on('click', function() {
      $('#panel-signup, #panel-login').animate( {
        left: '+=' + leftPanelSpacing + 'px'
      }, 350);
    });

    $('#button-login').on('click', function(e) {
      e.preventDefault();
      submitForm();
    });

    $('#password').on('blur', function() {
      log("Password blur");
      hideLoginFailure();
    });

    $("#loginform").submit(function(e) {
      e.preventDefault();
      setDefaultEmail($('#email').val());

      $("#password").blur();
      submitForm();
    });

    var showingFailure = false;

    function showLoginFailure() {
      // $('#panel-failure').slideUp();
      $('#panel-failure').animate( {
        bottom: '0px'
      }, 350);
      showingFailure = true;
    }

    function hideLoginFailure() {
      if (showingFailure) {
         $('#panel-failure').animate( {
            bottom: '-90px'
          }, 350);
      }
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
});

