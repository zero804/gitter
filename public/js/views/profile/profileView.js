/*jshint unused:strict, browser:true */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/profileView',
  'fineuploader',
  'views/widgets/avatar',
  'utils/validate-wrapper',
  'jquery-placeholder'  // No reference
], function($, _, context, TroupeViews, template, qq, AvatarView, validation) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit', 'onPasswordChange');
      if (!options) return;
      this.originalEmail = window.troupeContext.user.email;
      this.existingUser = options.existingUser;
      this.isExistingUser = !window.troupeContext.profileNotCompleted;
    },

    getRenderData: function() {
      var d = {
        user: window.troupeContext.user,
        existingUser: this.isExistingUser,
        // displayName: this.existingUser ? window.troupeContext.user.displayName : ""
        displayName: window.troupeContext.user.displayName
      };
      return d;
    },

    events: {
      "submit form#updateprofileform": "onFormSubmit",
      "keyup #password": "onPasswordChange",
      "change #password": "onPasswordChange"
    },

    resizeUploader: function() {
      $('.button-choose-avatar input').css('margin-left','-40px');
      $('.button-choose-avatar input').css('font-size','12px');
    },

    afterRender: function() {
      this.$el.find('#displayName').placeholder();
      this.$el.find('#password').placeholder();

      var self = this;
      new qq.FineUploaderBasic({
        button: self.$el.find('.button-choose-avatar')[0],
        multiple: false,
        validation: {
          allowedExtensions: ["png", "gif", "jpeg", "jpg"]
        },
        request: {
          endpoint: '/avatar/'
        },
        callbacks: {
          onSubmit: function(/*id, fileName*/) {

            var $el = self.$el.find('#frame-profile');
            self.removeSubViews($el);
            $el.empty().html('<img src="/images/2/troupe-ajax-guy-green.gif" class="trpSpinner"/>');
          },
          // return false to cancel submit
          onComplete: function(id, fileName, response) {
            if(response.success) {
              window.troupeContext.user.avatarUrlSmall = response.user.avatarUrlSmall;
              window.troupeContext.user.avatarUrlMedium = response.user.avatarUrlMedium;
              $(document).trigger('avatar:change', window.troupeContext.user);
            } else {
              // TODO: deal with this!
            }

            self.$el.find('#frame-profile').empty().append(new AvatarView({ user: window.troupeContext.user }).render().el);

          }
        }
      });

      // This is a horrid hack to get the uploader button working properly in Firefox
      setTimeout(function(){self.resizeUploader();},1000);

      // will bind to submit and change events, will not validate immediately.
      this.validateForm();

    },

    onPasswordChange: function() {
      if(!this.isExistingUser) return;
      var pw = this.$el.find('#password');
      if(!pw.val()) return;

      if(!this.oldPasswordVisible) {
        var field = this.$el.find('#oldPassword');
        field.show();
        field.removeAttr('value');
        field.attr('placeholder', "Type your old password here");
        field.placeholder(); // must do this here for IE
        this.oldPasswordVisible = true;
      }
    },

    validateForm: function() {
      var self = this;
      var form = this.$el.find('form#updateprofileform');

      // TODO:
      // server validation errors should be displayed nicely

      var validationConfig = {
        rules: {
          displayName: validation.rules.userDisplayName(),
          password: validation.rules.password(),
          oldPassword: { required: function() {
              // if this is an existing user and they have set a value for the password field then oldPassword is required as well.
              return (self.isExistingUser === true && !!self.$el.find('[name=password]').val());
            }
          }
        },
        debug: true,
        messages: {
          displayName: validation.messages.userDisplayName(),
          password: validation.messages.password(),
          oldPassword: {
            required: "You're trying to change your password. Please enter your old password, or clear the new password field."
          }
        },
        showErrors: function(errorMap, errorList) {
          if (errorList.length > 0) {
            self.$el.find('.form-failure').show();
          }
          else {
            self.$el.find('.form-failure').hide();
          }

          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          self.$el.find('.failure-text').html(errors);
        }
      };

      if (!this.isExistingUser) {
        validationConfig.rules.password.required = true;
      }

      form.validate(validationConfig);

    },

    hasChangedEmail: function(newEmail) {
      return newEmail && newEmail != this.originalEmail;
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();

      var form = this.$el.find('form#updateprofileform');
      var newEmail = form.find('[name=newEmail]').val();
      var that = this;

      if (this.hasChangedEmail(newEmail)) {
        // ask the user if they are sure they want to change their email address
        // if successful show a modal that says they will receive a confirmation email.
        if (!window.confirm("Are you sure you want to change your email?"))
          return;
      }

      $.ajax({
        url: "/profile",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.success) {
            window.troupeContext.user.displayName = data.displayName;
            if (that.compactView) {
              window.location.href = "/ios-app";
            }
            else {
              that.dialog.hide();
            }
            if (that.hasChangedEmail(newEmail)) {
              window.alert("Your address will be updated once you confirm the email sent to your new address.");
            }

          } else {
            if (data.emailConflict) {
              window.alert("That email address is already registered, please choose another.");
            }
            else if(data.authFailure) {
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
      options.title = "Edit your profile";
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
