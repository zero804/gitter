/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

// TODO: Better transition to request confirm page
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/loginRequestModalView',
  'log!login-request-modal-view',
  'utils/validate-wrapper',
  'jquery-placeholder' // No reference
], function($, _, context, TroupeViews, template, log, validation) {
  "use strict";

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
      var c = context();
      var troupe = context.getTroupe();

      return {
        email: this.initialEmail,
        homeUrl: c.homeUrl,
        appUri: troupe.uri,
        authenticated: this.authenticated,
        isOneToOne: troupe && troupe.oneToOne
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
      window.location.href = context().homeUrl;
    },

    validateForm : function () {
      if (this.authenticated) return;
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
      var postUri =  this.authenticated ? "/api/v1/requestaccessexisting" : "/api/v1/requestaccess";
      var email = this.getEmail();
      var that = this;
      log("PostUri: " + postUri);
      $('#request-failed').hide();

      $.ajax({
        url: postUri,
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        global: false,
        statusCode: {
          400: function(data) {
            if ($.parseJSON(data.responseText).userExists) {
              $('#user-exists').show();
            }
          }
        },
        success: function(data) {
          if(data.success) {
            if (that.authenticated) {
              $('.modal-content').hide();
              $('.modal-success').show();
            }
            else {
              that.trigger('confirm.request', { userEmail: email});
              return;
            }
          }

          if(data.userExists) {
            log('** HEY THAT USER EXISTS');
            that.trigger('request.login', { userExists: true });
            return;
          }
        },
        error: function() {
          log("Error with request");
          // $('#request-failed').show();
        }
      });

      return false;
    }
  });

});
