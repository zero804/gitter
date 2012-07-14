// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./loginModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
    },

    events: {
      "submit form": "onFormSubmit"
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