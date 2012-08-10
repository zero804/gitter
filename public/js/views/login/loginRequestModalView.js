// Filename: views/home/main
// TODO: Actually create a request
// TODO: Better transition to request confirm page
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./loginRequestModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if(options) {
        this.authenticated = options.authenticated;
      }

      _.bindAll(this, 'onFormSubmit');
    },

    getRenderData: function() {
      return {
        troupeUri: window.location.pathname.replace(/\//g,''),
        authenticated: this.authenticated
      };
    },

    events: {
      "submit form": "onFormSubmit",
      "click .signin" : "onFormSubmit", // delete this line
      "click #existing-user" : "showLoginForm"
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
            that.trigger('request.complete', data);
            return;
          }
          alert('Something went wrong. Oppsie daisy.');

        }
      });

      return false;
    }
  });

});