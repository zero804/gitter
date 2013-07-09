/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/signupModalView',
  'utils/validate-wrapper', // No reference
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template) {
  "use strict";

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
          // data = { email, success, userStatus, username }
          if (data.redirectTo) {
            window.location.href = "/" + data.redirectTo;
          }
          else if (data.userStatus === 'ACTIVE') {
            // forward to a login prompt
            $(document).trigger('login-prompt', { email: data.email });
          }
          else {
             that.trigger('signup.complete', data);
           }
        }
      });
    },


  });

});
