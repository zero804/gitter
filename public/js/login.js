require.config(window.require_config);

require(
    [
    'jquery',
    'retina' ],
    function($) {

      $('.mtrpLoginSignup').on('click', function(e) {
        $('.mtrpSignupForm').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
        $('.mtrpLoginForm').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
      });

      $('.mtrpLoginBack').on('click', function(e) {
        $('.mtrpSignupForm').anim({translate3d: '320px,0,0'}, 0.5, 'swing');
        $('.mtrpLoginForm').anim({translate3d: '0,0,0'}, 0.5, 'swing');
      });

      $('.mtrpLoginSubmit').on('click', function(e) {
        e.preventDefault();
        submitForm();
      });

      $("#loginform").submit(function(e) {
        e.preventDefault();
        submitForm();
    });

      // function submitForm()
      // {
      //   document.loginform.submit();
      // }

      function submitForm() {

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
            $('.mtrpLoginFailure').show('fast');

          },
          success: function(data) {
            console.dir(data);
            console.log("Login success, default uri returned: " + data.defaultTroupe.uri);
            if(data.failed) {
              console.log("No it actually failed");
              $('.mtrpLoginFailure').show('fast');
              return;
            }
            window.location.href="/" + data.defaultTroupe.uri;
          }
        });
      }
});
    
