/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/signupModalView',
  'utils/validate-wrapper', // No reference
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
    },

    events: {
      "submit form": "onFormSubmit"
    },

    afterRender : function() {
      this.validateForm();
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
          email: form.find("input[name=email]").val()
        }),
        type: "POST",
        success: function(data) {
          if (data.redirectTo) {
            window.location.href = "/" + data.redirectTo;
          }
          else {
             that.trigger('signup.complete', data);
           }
        }
      });
    },


  });

});
