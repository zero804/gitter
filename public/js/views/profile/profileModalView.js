// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./profileModalView',
  'jquery_ocupload'
], function($, _, TroupeViews, template) {

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
    },

    events: {
      "submit form#updateprofileform": "onFormSubmit"
    },

    reloadAvatar: function() {
      this.$el.find('.image-avatar').attr('src', "/avatar?_dc=" + Date.now());
    },

    afterRender: function(dom) {
      var self = this;
      var myUpload = self.$el.find('.button-choose-avatar').upload({
        name: 'files',
        action: '/avatar',
        enctype: 'multipart/form-data',
        params: {},
        autoSubmit: true,
        onSubmit: function() {},
        onComplete: function(response) {
          response = JSON.parse(response);
          if(response && response.success) {
            self.reloadAvatar();
          } else {
            /* TODO Handle. Something went wrong. */
          }
        },
        onSelect: function() {}
      });

    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();

      var form = this.$el.find('form#updateprofileform');
      var that = this;

      $.ajax({
        url: "/updateprofile",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          that.trigger('profile.complete', data);
        }
      });
    }

  });

});