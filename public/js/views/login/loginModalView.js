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
        success: function(data) {
           if(data.failed) {
            $('.login-failure').show('fast');
            return;
          }
          that.trigger('login.complete', data);
        }
      });
    }
  });

});