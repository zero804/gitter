/*jshint unused:true, browser:true */

// TODO: Better transition to request confirm page

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/loginRequestModalView',
  'jquery_validate',
  'jquery_placeholder'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if(options) {
        this.authenticated = options.authenticated;
      }

      _.bindAll(this, 'onFormSubmit','validateForm');
    },

    getRenderData: function() {
      return {
        homeUrl: window.troupeContext.homeUrl,
        troupeUri: window.location.pathname.replace(/\//g,''),
        authenticated: this.authenticated
      };
    },

    afterRender: function() {
      // if (!this.authenticated) this.validateForm();
      var nameEl = this.$el.find('#name');
      nameEl.placeholder();
      var emailEl = this.$el.find('#email');
      emailEl.placeholder();
    },

    events: {
      "submit form": "onFormSubmit",
      "click #existing-user" : "showLoginForm",
      "hover #submit-button" : "validateForm",
      "click #cancel-button" : "goBack"
    },

    goBack : function () {
      history.back();
    },

    validateForm : function () {
      var validateEl = this.$el.find('#requestAccess');
      validateEl.validate({
        rules: {
          name: "required",
          email: {
            required: true,
            email: true
            }
        },
        debug: true,
        showErrors: function(errorMap, errorList) {
          console.log("errorList: " + errorList.length);
          if (errorList.length === 0) $('.request-failure').hide();
          if (errorList.length > 0) $('.request-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        },
        messages: {
          name: {
            required: "Please tell us your name. "
          },
        email : {
          required: "We need to know your email address.",
          email: "Hmmm, that doesn't look like an email address."
          }
        }
        });
    },

    showLoginForm: function(e) {
      this.trigger('request.login');
    },

    onFormSubmit: function(e) {
      var form = this.$el.find('form');
      var that = this;
      var postUri =  this.authenticated ? "/requestAccessExistingUser" : "/requestAccessNewUser";

      $.ajax({
        url: postUri,
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.success) {
            $('.modal-content').hide();
            $('.modal-success').show();
            return;
          }
          alert('Something went wrong. Oppsie daisy.');

        }
      });

      return false;
    }
  });

});
