/*jshint unused:true browser:true*/
require([
  'jquery',
  'retina' ],
  function($) {
    if(window.localStorage.defaultTroupeEmail) {
      $('#email').val(window.localStorage.defaultTroupeEmail);
    }

    $('#button-signup').on('click', function(e) {
      $('#panel-signup, #panel-login').animate( {
        left: '-=320px'
      }, 350);

      // $('#panel-login').animate({translate3d: '-320px,0,0'}, 0.5, 'swing');
    });

    $('#button-back').on('click', function(e) {
      $('#panel-signup, #panel-login').animate( {
        left: '+=320px'
      }, 350);
    });

    $('#button-login').on('click', function(e) {
      e.preventDefault();
      submitForm();
    });

    $('#password').on('blur', function(e) {
      console.log("Password blur");
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
      console.log("UP YOU SLIDE");
      // $('#panel-failure').slideUp();
      $('#panel-failure').animate( {
        bottom: '0px'
      }, 350);
      showingFailure = true;
    }

    function hideLoginFailure() {
      if (showingFailure) {
        console.log("DOWN YOU SLIDE");
         $('#panel-failure').animate( {
            bottom: '-90px'
          }, 350);
      }
    }

    function submitForm() {
      hideLoginFailure();
      var form = $('#loginform');
      var that = this;

      $.ajax({
        url: "/login",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error");
          showLoginFailure();

        },
        success: function(data) {
          if(data.failed) {
            console.log("No it actually failed");
            showLoginFailure();
            return;
          }

          window.location.href = data.redirectTo;
        }
      });
    }
});

