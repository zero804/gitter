/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/profileView',
  'fineuploader',
  'jquery_validate', // no ref
  'jquery_placeholder'
], function($, _, TroupeViews, template, qq) {

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit', 'onPasswordChange');
      if (!options) return;
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

    afterRender: function() {
      this.$el.find('#displayName').placeholder();
      this.$el.find('#password').placeholder();

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
          onSubmit: function(id, fileName) {
            // display spinner
            // self.$el.find('.trpDisplayPicture').css('background', 'url("/images/2/troupe-ajax-guy.gif") center center no-repeat');
            self.$el.find('.trpDisplayPicture').replaceWith('<img src="/images/2/troupe-ajax-guy-green.gif" class="trpSpinner"/>');
          },
          // return false to cancel submit
          onComplete: function(id, fileName, response) {
            if(response.success) {
              window.troupeContext.user = response.user;
            } else {
              // TODO: deal with this!
            }
          }
        }
      });

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
      // alphanumeracy of displayName should match validation on server (no numbers allowed)
      // server validation errors should be displayed nicely

      var validation = {
        rules: {
          displayName: { required: true, minlength: 2 },
          password: { minlength: 6 },
          oldPassword: { required: function() {
              // if this is an existing user and they have set a value for the password field then oldPassword is required as well.
              return (self.isExistingUser === true && !!self.$el.find('[name=password]').val());
            }
          }
        },
        debug: true,
        messages: {
          displayName: {
            required: "Please tell us your name."
          },
          password: {
            minlength: "Password must be at least 6 characters.",
            required: "You need to set your password for the first time."
          },
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
        // validation.password.required = true;
      }

      form.validate(validation);

    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();

      var form = this.$el.find('form#updateprofileform');
      var that = this;

      console.log("Posting form");

      $.ajax({
        url: "/profile",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if(data.success) {
            console.log("Successfully posted form. CV: " + that.compactView);
            window.troupeContext.user.displayName = data.displayName;
            if (that.compactView) {
              console.log("Redirect to ios app now");
              window.location.href = "/ios-app";
            }
            else {
              that.dialog.hide();
            }
          } else {
            if(data.authFailure) {
              console.log("Failed to post form");
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
