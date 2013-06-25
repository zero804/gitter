/*jshint unused:true, browser:true */

// TODO: Better transition to request confirm page
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/loginRequestModalView',
  'log!login-request-modal-view',
  'utils/validate-wrapper',
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template, log, validation) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if(options) {
        this.initialEmail = options.email;
        this.authenticated = options.authenticated;
      }

      _.bindAll(this, 'onFormSubmit','validateForm');
    },

    getRenderData: function() {
      var c = window.troupeContext;
      return {
        email: this.initialEmail,
        homeUrl: c.homeUrl,
        troupeUri: c.troupe.uri,
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
      if (window.troupeContext.homeUrl) {
        window.location.href= window.troupeContext.homeUrl;
      }
    },

    validateForm : function () {
      var validateEl = this.$el.find('#requestAccess');
      validateEl.validate({
        rules: {
          name: validation.rules.userDisplayName(),
          email: validation.rules.userEmail()
        },
        messages: {
          name: validation.messages.userDisplayName(),
          email : validation.messages.userEmail()
        },
        showErrors: function(errorMap) {
          log("Validation errors: ", errorMap);

          var errors = "";

          _.each(_.keys(errorMap), function(key) {
            var errorMessage = errorMap[key];
            errors += errorMessage + "<br>";
          });

          $('#failure-text').html(errors);
          if(errors) {
            $('#request_validation').show();
          } else {
             $('#request_validation').hide();
          }
        }
     });
    },

    getEmail: function() {
      return this.$el.find('input[name=email]').val();
    },

    showLoginForm: function() {
      this.trigger('request.login');
    },

    onFormSubmit: function() {
      var form = this.$el.find('form');
      var that = this;
      var postUri =  this.authenticated ? "/requestAccessExistingUser" : "/requestAccessNewUser";

      $('#request-failed').hide();

      $.ajax({
        url: postUri,
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        globa: false,
        success: function(data) {
          if(data.success) {
            $('.modal-content').hide();
            $('.modal-success').show();
            return;
          }

          if(data.userExists) {
            that.trigger('request.login', { userExists: true });
            return;
          }
        },
        error: function() {
          $('#request-failed').show();
        }
      });

      return false;
    }
  });

});
