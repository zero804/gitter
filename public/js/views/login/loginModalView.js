/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/loginModalView',
  'jquery-placeholder'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if (options) {
        this.initialEmail = options.email;
        this.fromSignup = options.fromSignup;
        this.userExists = options.userExists;
      }
      _.bindAll(this, 'onFormSubmit');
    },

    getRenderData: function() {
      return {
        userExists: this.userExists,
        email: this.initialEmail,
        autofocusEmail: this.initialEmail ? '': 'autofocus',
        autofocusPassword: this.initialEmail ? 'autofocus' : '',
        troupeUri: this.fromSignup ? null : window.location.pathname.replace(/\//g,''),
        fromSignup: this.fromSignup,
        isOneToOne: (window.troupeContext && window.troupeContext.troupe) ? !!window.troupeContext.troupe.oneToOne : null
      };
    },

    afterRender: function() {
      var loginEl = this.$el.find('#email');
      loginEl.placeholder();
      var passwordEl = this.$el.find('#password');
      passwordEl.placeholder();
    },

    events: {
      "submit form": "onFormSubmit",
      "click .button-request-new-password" : "resetClicked",
      "click #send-reset" : "sendResetClicked",
      "click #go-back" : "backClicked",
      "click #button-close" : "closeClicked",
      "click .button-resend-confirmation": "resendConfirmation",
      "click #new-user": "showRequestAccess"
    },

    backClicked: function(e) {
      this.$el.find('.login-content').show();
      this.$el.find('.resetpwd-content').hide();
      this.$el.find('.resetpwd-failed').hide();
    },

    resetClicked: function(e) {
      this.$el.find('.login-content').hide();
      this.$el.find('.resetpwd-content').show();
      this.$el.find('#resetEmailAddress').text(this.$el.find('#email').val());
    },

    closeClicked: function(e) {
      this.trigger('login.close');
    },

    sendResetClicked: function(e) {
      var that = this;
      var form = this.$el.find('form');
      $.ajax({
        url: "/reset",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.failed) {
            that.$el.find('.resetpwd-content').hide();
            that.$el.find('.resetpwd-failed').show();
          }
          else {
            that.$el.find('.resetpwd-content').hide();
            that.$el.find('#resetEmail').text(that.$el.find('#email').val());
            that.$el.find('.resetpwd-confirm').show();
          }
        }
      });

    },

    markUserAsExisting: function(email) {
      window.localStorage.defaultTroupeEmail = email;
    },

    onFormSubmit: function(e) {
      $('.login-failure').hide();
      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      that.$el.find('.login-message').hide('fast');

      $.ajax({
        url: "/login",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        error: function(jqXHR, textStatus, errorThrown) {
          if(jqXHR.status == 401) {
            try {
              var data = jQuery.parseJSON(jqXHR.responseText);

              if(data.reason === "account_not_activated") {
                that.$el.find('.login-failure-account-not-activated').show('fast');
                return;
              }
            } catch(e) {
            }
          }
          that.$el.find('.login-failure').show('fast');
        },
        success: function(data) {
          if(data.failed) {
            that.$el.find('.login-failure').show('fast');
            return;
          }
          that.markUserAsExisting(that.$el.find('#email').val());
          that.trigger('login.complete', data);
        }
      });
    },

    resendConfirmation: function(e) {
      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      that.$el.find('.login-message').hide('fast');

      $.ajax({
        url: "/resendconfirmation",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          that.$el.find('.login-content').hide('fast');
          that.$el.find('.resend-confirm').show('fast');
        }
      });
    },

    getEmail: function() {
      return this.$el.find('input[name=email]').val();
    },

    showRequestAccess: function() {
      this.trigger('request.access');
    }
  });

});
