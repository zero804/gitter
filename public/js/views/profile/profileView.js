/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

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
      _.bindAll(this, 'onFormSubmit', 'onPasswordChange', 'onError');
      if (!options) return;
      this.originalEmail = context.getUser().email;
      this.hasPassword = context.getUser().hasPassword;
      if (this.compactView) $("#uvTab").hide();

      this.on('menuItemClicked', this.menuItemClicked);
    },

    menuItemClicked: function(action) {
      switch(action) {
        case 'save':
          this.$el.find('form#updateprofileform').submit(); return;
        case 'signout':
          window.location.href = '/signout'; return;
      }
    },

    getRenderData: function() {
      return {
        user: context.getUser(),
        existingUser: this.hasPassword /* this is a bit confusing */,
        hasPassword: this.hasPassword,
        displayName: context.getUser().displayName
      };
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
              var userModel = context.user();
              userModel.set('avatarUrlSmall', response.user.avatarUrlSmall);
              userModel.set('avatarUrlMedium', response.user.avatarUrlMedium);
            } else {
              // TODO: deal with this!
            }

            self.$el.find('#frame-profile').empty().append(new AvatarView({ user: context.getUser() }).render().el);

          }
        }
      });

      // This is a horrid hack to get the uploader button working properly in Firefox
      setTimeout(function(){self.resizeUploader();},1000);

      // will bind to submit and change events, will not validate immediately.
      this.validateForm();

    },

    onPasswordChange: function() {
      if(!this.hasPassword) return;
      var pw = this.$el.find('#password');
      if(!pw.val()) return;

      if(!this.oldPasswordVisible) {
        var field = this.$el.find('#old-password');
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
          username: 'required',
          password: validation.rules.password(),
          oldPassword: { required: function() {
              // if this is an existing user and they have set a value for the password field then oldPassword is required as well.
              return (self.hasPassword && !!self.$el.find('[name=password]').val());
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
        showErrors: this.onError,
      };

      if (!this.hasPassword) {
        validationConfig.rules.password.required = true;
      }

      form.validate(validationConfig);

    },

    onError: function(errorMap, errorList) {
      if (errorList.length > 0) {
        this.$el.find('.form-failure').show();
      }
      else {
        this.$el.find('.form-failure').hide();
      }

      var errors = "";
      $.each(errorList, function () { errors += this.message + "<br>"; });
      this.$el.find('.failure-text').html(errors);
    },

    hasChangedEmail: function(newEmail) {
      return newEmail && newEmail != this.originalEmail;
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();
      if(!this.$el.find('#updateprofileform').valid()) return;

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
            var user = context.user();
            user.set('displayName', data.displayName);
            user.set('status', 'ACTIVE');
            user.set('hasPassword', true);

            that.trigger('submit.success');

            if(that.dialog) {
              that.dialog.hide();
            }

            if (that.hasChangedEmail(newEmail)) {
              window.alert("Your address will be updated once you confirm the email sent to your new address.");
            }

          } else {
            that.onFormSubmitFailure(data);
          }
        }
      });
    },
    onFormSubmitFailure: function(err) {
      if (err.emailConflict) {
        window.alert("That email address is already registered, please choose another.");
      }
      else if(err.authFailure) {
        this.$el.find('#oldPassword').val("");
        window.alert("Your old password is incorrect");
      }
    }
  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Edit your profile";

      options.menuItems = [
        { text: 'Save', action: 'save', class: 'trpBtnGreen' }
      ];

      if (context.getUser().hasPassword) {
        options.menuItems.push({ text: 'Signout', action: 'signout', class: 'trpBtnLightGrey' });
      }

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);

      var self = this;
      this.view.on('submit.success', function(username) {
        self.trigger('submit.success', username);
      });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
