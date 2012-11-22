require.config(window.require_config);

require(
    [
    'jquery',
    'views/base',
    'retina' ],
    function($, TroupeViews ) {

      $('.mtrpLoginSignup').on('click', function(e) {
        $('.mtrpSignupForm').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
        $('.mtrpLoginForm').anim({translate3d: '-320px,0,0'}, 0.5, 'swing');
      });

      $('.mtrpLoginBack').on('click', function(e) {
        $('.mtrpSignupForm').anim({translate3d: '320px,0,0'}, 0.5, 'swing');
        $('.mtrpLoginForm').anim({translate3d: '0,0,0'}, 0.5, 'swing');
      });

      $('.mtrpLoginSubmit').on('click', function(e) {
        submitForm();
      });

      function submitForm()
      {
        document.loginform.submit();
      }

});
    
