// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./profileModalView',
  'jquery_ocupload',
  'jquery_placeholder'
], function($, _, TroupeViews, template) {

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit', 'onPasswordChange');
      if (!options) return;
      this.existingUser = options.existingUser;
    },

    getRenderData: function() {
      return {
        existingUser: this.existingUser,
        // displayName: this.existingUser ? window.troupeContext.user.displayName : ""
        displayName: window.troupeContext.user.displayName
      };
    },

    events: {
      "submit form#updateprofileform": "onFormSubmit",
      "keyup #password": "onPasswordChange",
      "change #password": "onPasswordChange"
    },

    reloadAvatar: function() {
      this.$el.find('.image-avatar').attr('src', "/avatar?_dc=" + Date.now());
    },

    afterRender: function() {
      var displayNameEl = this.$el.find('#displayName');
      displayNameEl.placeholder();
      var passwordEl = this.$el.find('#password');
      passwordEl.placeholder();
      var oldpasswordEl = this.$el.find('#oldpassword');
      oldpasswordEl.placeholder();

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

    onPasswordChange: function(e) {
      if(!this.existingUser) return;
      var pw = this.$el.find('#password');
      if(!pw.val()) return;

      if(!this.oldPasswordVisible) {
        var field = this.$el.find('#oldPassword');
        field.show();
        field.removeAttr('value');
        field.attr('placeholder', "Type your old password here");
        this.oldPasswordVisible = true;
      }
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();

      var form = this.$el.find('form#updateprofileform');
      var that = this;

      $.ajax({
        url: "/profile",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.success) {
            window.troupeContext.user.displayName = data.displayName;
            that.trigger('profile.complete', data);
          } else {
            if(data.authFailure) {
              that.$el.find('#oldPassword').val("");
              window.alert("You old password is incorrect");
            }
          }
        }
      });
    }

  });

});