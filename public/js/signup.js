require.config(window.require_config);

// Two weird things I can't figure out here.
// Firstly, the first time you click Get Started if you haven't touched any of the form elements, no tooltip shows
// even though the tooltip show call looks like it happens - I tested to make sure it was being executed by putting an alert before it
// I thought it maybe had something to do with the form field automatically focusing, so I turned focusInvalid on the validater off
// and that didn't do anything. 
//
// AH! I figured it out. The tooltip element hasn't been created yet or something like that. If I pre-create the tooltip in the HTML (see the moustache file)
// then it's all fine. But this is a filthy hack.

// The second bit I don't get is that the tooltips continue to show afterwards, even if I try to set options.trigger to manual, they still still
// on hover and focus. Annoying.
//
// Anyhoo, it's a bit of a mess at the moment, but at least it won't submit with bad shit in it.

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
    
