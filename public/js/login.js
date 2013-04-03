/*jshint unused:true, browser:true*/
require([
  'jquery',
  'retina' ],
  function($) {
    if(window.localStorage.defaultTroupeEmail) {
      $('#email').val(window.localStorage.defaultTroupeEmail);
    }

    if (typeof console != "undefined") console.log("Document: " + $(document).width());
    var leftPanelSpacing = (($(document).width() - 320) / 2) + 320;

    if (typeof console != "undefined") console.log("Where am I: " + leftPanelSpacing);

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
      if (typeof console != "undefined") console.log("Password blur");
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
      if (typeof console != "undefined") console.log("UP YOU SLIDE");
      // $('#panel-failure').slideUp();
      $('#panel-failure').animate( {
        bottom: '0px'
      }, 350);
      showingFailure = true;
    }

    function hideLoginFailure() {
      if (showingFailure) {
        if (typeof console != "undefined") console.log("DOWN YOU SLIDE");
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
          if (typeof console != "undefined") console.log("Error");
          showLoginFailure();

        },
        success: function(data) {
          if(data.failed) {
            if (typeof console != "undefined") console.log("No it actually failed");
            showLoginFailure();
            return;
          }

          window.location.href = data.redirectTo;
        }
      });
    }
});

