require.config(window.require_config);

require(
    [
    'jquery',
    'retina' ],
    function($) {
      if(window.localStorage.defaultTroupeEmail) {
        $('#email').val(window.localStorage.defaultTroupeEmail);
      }

      $('#button-signup').on('click', function(e) {
        $('#panel-signup').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
        $('#panel-login').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
      });

      $('#button-back').on('click', function(e) {
        $('#panel-signup').anim({translate3d: '320px,0,0'}, 0.5, 'swing');
        $('#panel-login').anim({translate3d: '0,0,0'}, 0.5, 'swing');
      });

      $('#button-login').on('click', function(e) {
        e.preventDefault();
        submitForm();
      });

      $('#password').on('blur', function(e) {
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
        $('#panel-failure').anim({translate3d: '0px, -160px,0'}, 0.5, 'swing');
        showingFailure = true;
      }

      function hideLoginFailure() {
        if (showingFailure) {
          $('#panel-failure').anim({translate3d: '0px, 160px,0'}, 0.5, 'swing');
          showingFailure = false;
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

