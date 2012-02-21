require.config({
  paths : {
    jquery : 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min'
  },
  priority : [ 'jquery' ]
});

require(
    [ 'jquery', 'jquery_validate' ],
    function($, v) {
      $("#signupForm").validate({
        errorClass : "help-inline",
        rules : {
          troupeName : {
            maxlength : 32,
            required : true,
            remote: {
              url: "troupenameavailable",
              type: "get"
            }
          },
        },
        messages: {
          troupeName: {
            remote: "Sorry, this name is taken, please choose another." 
          }
        }
  
      });
});
    
