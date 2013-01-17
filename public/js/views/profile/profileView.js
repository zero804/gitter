// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./profileView',
  'fineuploader',
  'jquery_placeholder'
], function($, _, TroupeViews, template, qq) {

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit', 'onPasswordChange');
      if (!options) return;
      this.existingUser = options.existingUser;
    },

    getRenderData: function() {
      var d = {
        user: window.troupeContext.user,
        existingUser: !window.troupeContext.profileNotCompleted,
        // displayName: this.existingUser ? window.troupeContext.user.displayName : ""
        displayName: window.troupeContext.user.displayName
      };
      console.dir(d);
      return d;
    },

    events: {
      "submit form#updateprofileform": "onFormSubmit",
      "keyup #password": "onPasswordChange",
      "change #password": "onPasswordChange"
    },

    reloadAvatar: function(user) {
      $(document).trigger('avatar:change', { userId: user.id, avatarUrlSmall: user.avatarUrlSmall, avatarUrlMedium: avatarUrlMedium });

      var newAvatarURL = 'url("' + user.avatarUrlSmall + '")';
      this.$el.find('.image-avatar').css('background-image', newAvatarURL);
    },

    afterRender: function() {
      var displayNameEl = this.$el.find('#displayName');
      displayNameEl.placeholder();
      var passwordEl = this.$el.find('#password');
      passwordEl.placeholder();
      var oldpasswordEl = this.$el.find('#oldpassword');
      oldpasswordEl.placeholder();

      var self = this;
      var uploader = new qq.FineUploaderBasic({
        button: self.$el.find('.button-choose-avatar')[0],
        multiple: false,
        validation: {
          allowedExtensions: ["png", "gif", "jpeg", "jpg"]
        },
        request: {
          endpoint: '/avatar/'
        },
        callbacks: {
          onSubmit: function(id, fileName) {},
          // return false to cancel submit
          onComplete: function(id, fileName, response) {
            if(response.success) {
              window.troupeContext.user = response.user;
              self.reloadAvatar(response.user);
            } else {
              // TODO: deal with this!
            }
          }
        }
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
            that.dialog.hide();
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

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});