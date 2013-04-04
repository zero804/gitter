/*jshint unused:true, browser:true*/
require([
  'jquery',
  'utils/log',
  'retina'],
  function($, log) {
    if(window.localStorage.defaultTroupeEmail) {
      $('#email').val(window.localStorage.defaultTroupeEmail);
    }

    log("Document: " + $(document).width());
    var leftPanelSpacing = (($(document).width() - 320) / 2) + 320;

    log("Where am I: " + leftPanelSpacing);

    $('#panel-signup').css('left', leftPanelSpacing + 'px');

    $('#button-signup').on('click', function() {
      $('#panel-signup, #panel-login').animate( {
        left: '-=' + leftPanelSpacing + 'px'
      }, 350);

      // $('#panel-login').animate({translate3d: '-320px,0,0'}, 0.5, 'swing');
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
      window.localStorage.defaultTroupeEmail = $('#email').val();

      $("#password").blur();
      submitForm();
    });

    var showingFailure = false;

    function showLoginFailure() {
      log("UP YOU SLIDE");
      // $('#panel-failure').slideUp();
      $('#panel-failure').animate( {
        bottom: '0px'
      }, 350);
      showingFailure = true;
    }

    function hideLoginFailure() {
      if (showingFailure) {
        log("DOWN YOU SLIDE");
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

