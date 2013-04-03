/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/signupModalView',
  'jquery_validate',
  'jquery_placeholder'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      if (!options) return;
      this.existingUser = options.existingUser;
    },

    events: {
      "submit form": "onFormSubmit"
    },

    getRenderData: function() {
      if (window.troupeContext) {
        userId = window.troupeContext.user.id;
        return {
          existingUser: this.existingUser,
          userId: userId
        };
      } else {
        return {
          existingUser: this.existingUser
        };
     }
    },

    afterRender : function() {
      this.validateForm();
      this.$el.find('#troupeName').placeholder();
      this.$el.find('#email').placeholder();
    },

    validateForm : function () {
      this.$el.find('#signup-form').validate({
        debug: true,
        showErrors: function(errorMap, errorList) {
          if (errorList.length > 0) $('.signup-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        },
        messages: {
          troupeName: {
            minlength: "Please choose a longer name for your Troupe, it needs to be at least 4 letters.",
            required: "Please choose a name for your Troupe. "
          },
        email : {
          required: "We need to know your email address",
          email: "Hmmm, that doesn't look like your email address."
          }
        }
        });
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      $.ajax({
        url: "/signup",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          troupeName: form.find("input[name=troupeName]").val(),
          email: form.find("input[name=email]").val()
        }),
        type: "POST",
        success: function(data) {
          if (typeof console != "undefined") console.log(JSON.stringify(data));

          if (data.redirectTo) {
            window.location.href = "/" + data.redirectTo;
          }
          else {
             that.trigger('signup.complete', data);
           }
        }
      });
    }

  });

});
