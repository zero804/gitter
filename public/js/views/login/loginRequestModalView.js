// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./loginRequestModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
    },

    events: {
      "submit form": "onFormSubmit",
      "click .signin" : "onFormSubmit", // delete this line
      "click #existing-user" : "showLoginForm"
    },

    showLoginForm: function(e) {
      alert("Transition to login form");
    },

    onFormSubmit: function(e) {
      alert("Create request");
      var that = this;
      that.trigger('request.complete');
    }
  });

});