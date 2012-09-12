require.config(window.require_config);

require(
    [
    'jquery',
    'views/base',
    'views/signup/signupModalView',
    'views/signup/signupModalConfirmView',
    'views/login/loginModalView',
    'jquery_validate' ],
    function($, TroupeViews, SignupModalView, SignupModalConfirmView, LoginModalView) {
      var loginFormVisible = false;

      var validationErrors = {};
      function attachTooltipHandlerToItem(index, el) {
        var jel = $(el);
          jel.tooltip({title: function() {
            var v = validationErrors[el.name];
            return v ? v:"";
          }});
      }

jQuery(function($) { 

  // settings
  var $slider = $('.slider'); // class or id of carousel slider
  var $slide = 'li'; // could also use 'img' if you're not using a ul
  var $transition_time = 1500; // 1 second
  var $time_between_slides = 4000; // 4 seconds

  function slides(){
    return $slider.find($slide);
  }

  slides().fadeOut();

  // set active classes
  slides().first().addClass('active');
  slides().first().fadeIn($transition_time);

  $interval = setInterval(
    function(){
      var $i = $slider.find($slide + '.active').index();

      slides().eq($i).removeClass('active');
      slides().eq($i).fadeOut($transition_time);

      if (slides().length == $i + 1) $i = -1; // loop to start

      slides().eq($i + 1).fadeIn($transition_time);
      slides().eq($i + 1).addClass('active');
    }
    , $transition_time +  $time_between_slides 
  );

});

      $('.button-signup').on('click', function() {
        var view = new SignupModalView({existingUser: false});
        var modal = new TroupeViews.Modal({ view: view });
        view.on('signup.complete', function(data) {
          modal.off('signup.complete');

          modal.transitionTo(new TroupeViews.Modal({ view: new SignupModalConfirmView({ data: data }) }));
        });

        modal.show();

        return false;
      });


      $('.button-existing-users-login').on('click', function() {
        var view = new LoginModalView({ fromSignup:true });
        var modal = new TroupeViews.Modal({ view: view });
        view.on('login.complete', function(data) {
          modal.off('login.complete');

          window.location.href="/" + data.defaultTroupe.uri;
        });

        modal.show();

        return false;
      });



      $('#signupForm .validateable').each(attachTooltipHandlerToItem);
      $("#signupForm").validate({
        debug: true,
        focusInvalid: false,
        submitHandler: function(form) {
          form.submit();
        },
        showErrors: function(errorMap, errorList){
          $('#signupForm .validateable').each(function(index, el) {
            if (errorMap[el.name]) {
              $(el).data('tooltip').options.placement = 'bottom';
              $(el).data('tooltip').options.trigger = 'focus';
              $(el).tooltip('show');
            } else {
              $(el).tooltip('hide');
            }

          });
          validationErrors = errorMap;
        },
        errorClass : "help-inline",
        rules : {
          troupeName : {
            maxlength : 32,
            minlength: 4,
            required : true
          },
          email : {
            required: true,
            email: true
          }
        },
        messages: {
          troupeName: {
            minlength: "Please choose a longer name for your Troupe. It needs to be at least 4 letters.",
            required: "Please choose a name for your Troupe."
          },
          email : {
            required: "Please type your email address here.",
            email: "Hmmm, that doesn't look like an email address."
          }
        }
  
      });
});
    
