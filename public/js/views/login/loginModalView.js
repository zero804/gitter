// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./loginModalView',
  'jquery_placeholder'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if (options) {
        this.initialEmail = options.email;
        this.fromSignup = options.fromSignup;
      }
      _.bindAll(this, 'onFormSubmit');
    },

    getRenderData: function() {
      return {
        email: this.initialEmail,
        autofocusEmail: this.initialEmail ? '': 'autofocus',
        autofocusPassword: this.initialEmail ? 'autofocus' : '',
        troupeUri: this.fromSignup ? null : window.location.pathname.replace(/\//g,'')
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
      "click .trpModalFailureText" : "resetClicked",
      "click #send-reset" : "sendResetClicked",
      "click #go-back" : "backClicked",
      "click #button-close" : "closeClicked"
    },

    backClicked: function(e) {
      this.$el.find('.login-content').show();
      this.$el.find('.resetpwd-content').hide();
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
            return;
          }
          that.$el.find('#resetEmail').text(that.$el.find('#email').val());
          that.$el.find('.resetpwd-content').hide();
          that.$el.find('.resetpwd-confirm').show();
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

      $.ajax({
        url: "/login",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        error: function(jqXHR, textStatus, errorThrown) {
          $('.login-failure').show('fast');
        },
        success: function(data) {
          console.log("Login success");
          if(data.failed) {
            $('.login-failure').show('fast');
            return;
          }
          that.markUserAsExisting(that.$el.find('#email').val());
          that.trigger('login.complete', data);

        }
      });
    }
  });

});