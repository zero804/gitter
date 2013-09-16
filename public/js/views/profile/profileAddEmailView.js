/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'views/signup/signupModalConfirmView',
  'hbs!./tmpl/profileAddEmail',
  'fineuploader',
  'views/widgets/avatar',
  'utils/validate-wrapper',
  'jquery-placeholder'  // No reference
], function($, _, context, TroupeViews, SignupConfirmView, template, qq, AvatarView, validation) {
  "use strict";

  var AddEmailView = TroupeViews.Base.extend({
    template: template,

    events: {
      "submit form": "onFormSubmit",
      "click #saveEmailBtn": 'submit',
      "click #saveEmailCancelBtn": 'cancel'
    },

    afterRender: function() {
      // will bind to submit and change events, will not validate immediately.
      this.validateForm();
    },

    validateForm: function() {
      var self = this;
      var form = this.$el.find('form');

      var validationConfig = {
        rules: {
          email: validation.rules.userEmail()
        },
        debug: true,
        messages: {
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

      this.validator = form.validate(validationConfig);

    },

    submit: function() {
      this.$el.find('form').submit();
    },

    getEmail: function() {
      var form = this.$el.find('form');

      return form.find('input[name=email]').val();
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();

      var self = this;
      this.collection.create({ email: this.getEmail() }, {
        success: function() {
          // self.showConfirmation();
          self.back();
        },
        global: false,
        error: function() {
          self.validator.showErrors({
            'server-validation': 'Please try another address, that address is likely already used.'
          });
        }
      });
    },

    showConfirmation: function() {
      var v = new SignupConfirmView({ email: this.getEmail() });
      this.dialog.transitionTo(new TroupeViews.Modal({ view: v }));
    },

    cancel: function() {
      if (this.dialog) this.dialog.hide();
    },

    back: function() {
      this.cancel();
      window.location.href="#|profile/emails";
    }

  });

  var AddEmailModal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options ? options : {};
      options.title = "Add Email Address";
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new AddEmailView({ collection: options.collection });

      var self = this;
      this.view.on('submit.success', function(username) {
        self.trigger('submit.success', username);
      });
    }
  });

  return {
    View: AddEmailView,
    Modal: AddEmailModal
  };

});
