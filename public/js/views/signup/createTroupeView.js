/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/createTroupeView',
  'views/share/shareTableView',
  'utils/log',
  'jquery_validate', // no ref
  'jquery_placeholder' // no ref
], function($, _, TroupeViews, template, ShareTableView, log) {
  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      if (!options) return;
      this.existingUser = options.existingUser;
      this.shareTableView = new ShareTableView();

      if (window.troupeContext) {
        this.isOneToOne = window.troupeContext.troupe.oneToOne;
      } else {
        this.isOneToOne = false;
      }
    },

    events: {
      "submit form": "onFormSubmit"
    },

    getRenderData: function() {
      var data = {
        existingUser: this.existingUser,
        isOneToOne: this.isOneToOne
      };

      if (window.userId) {
        data.userId = window.userId;
      }
      else if (window.troupeContext) {
        data.userId = window.troupeContext.user.id;
      }

      return data;
    },

    afterRender: function() {
      this.$el.find('#invites-for-create').append(this.shareTableView.el);

      this.validateForm();
      this.$el.find('#troupeName').placeholder();
      this.$el.find('#email').placeholder();
    },

    validateForm : function () {
      var validationConfig = _.extend(this.shareTableView.getValidationConfig());

      validationConfig.showErrors = function(errorMap, errorList) {
        if (errorList.length > 0) {
          $('.signup-failure').show();
        }
        else {
          $('.signup-failure').hide();
        }
        var errors = "";
        $.each(errorList, function () { errors += this.message + "<br>"; });
        $('#failure-text').html(errors);
      };

      validationConfig.messages.troupeName = {
        minlength: "Please choose a longer name for your Troupe, it needs to be at least 4 letters.",
        required: "Please choose a name for your Troupe. "
      };

      validationConfig.messages.email = {
        required: "We need to know your email address",
        email: "Hmmm, that doesn't look like your email address."
      };

      this.$el.find('#signup-form').validate(validationConfig);
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();
      var that = this, form = this.$el.find('form'), serializedForm = {
        name: form.find('input[name=troupeName]').val(),
        userId: form.find('input[name=userId]').val(),
        invites: this.shareTableView.serialize()
      };

      // we are sometimes executing from the signup page which excludes all the app integrated goodness
      if (this.collection && window.troupeContext) {

        if (window.troupeContext.troupe.oneToOne) {
          serializedForm.oneToOneTroupeId = window.troupeContext.troupe.id;
        }

        that.collection.create(serializedForm, {
          url: '/troupes/',
          wait: true,
          success: function(troupe /*, resp, options*/) {
            log('response from upgrading one to one troupe', troupe);
            window.location.href = "/" + troupe.get('uri') + "#|shareTroupe";
          }
        });
      }
      // we are operating from the signup page, without app integrated, so we don't have a collection
      else {
        log("Serialized form: " + serializedForm);
        $.ajax({
          url: "/signup",
          contentType: "json",
          dataType: "json",
          data: JSON.stringify(serializedForm),
          type: "POST",
          success: function(data) {
            if (data.redirectTo) {
              window.location.href = "/" + data.redirectTo + "#|shareTroupe";
            }
          }
        });
      }
    }

  });

var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
