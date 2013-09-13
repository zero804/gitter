/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/createTroupeView',
  'log!create-troupe-view',
  'utils/validate-wrapper',
  'jquery-placeholder' // no ref
], function($, _, context, TroupeViews, template, log, validation) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      if (!options) return;
      this.upgradeOneToOne = options.upgradeOneToOne;
      this.existingUser = options.existingUser;
      this.isOneToOne = context.inOneToOneTroupeContext();
    },

    events: {
      "submit form": "onFormSubmit"
    },

    getRenderData: function() {
      var data = {
        existingUser: this.existingUser,
        isOneToOne: this.isOneToOne,
        upgradeOneToOne: this.upgradeOneToOne
      };

      // TODO: What is window.userId????
      if (window.userId) {
        data.userId = window.userId;
      } else {
        data.userId = context.getUserId();
      }

      return data;
    },

    afterRender: function() {
      this.validateForm();
      this.$el.find('#troupeName').placeholder();
      this.$el.find('#email').placeholder();
    },

    validateForm : function () {
      var validationConfig = {
        rules: {
          troupeName: validation.rules.troupeName(),
          email: validation.rules.userEmail()
        },

        messages: {
          troupeName: validation.messages.troupeName(),
          email: validation.messages.troupeName()
        },

        showErrors: function(errorMap, errorList) {
          if (errorList.length > 0) {
            $('.signup-failure').show();
          }
          else {
            $('.signup-failure').hide();
          }
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        }
      };

      this.$el.find('#signup-form').validate(validationConfig);
    },

    onFormSubmit: _.debounce(function(e) {
      if(e) e.preventDefault();
      this.disableForm();

      var that = this;
      var form = this.$el.find('form');

      var serializedForm = {
        troupeName: form.find('input[name=troupeName]').val(),
        userId: form.find('input[name=userId]').val()
      };

      if(context.inOneToOneTroupeContext() && this.upgradeOneToOne) {
        serializedForm.oneToOneTroupeId = context.getTroupeId();
      }

      that.collection.create(serializedForm, {
        url: '/troupes/',
        wait: true,
        success: function(troupe /*, resp, options*/) {
          that.enableForm();
          log('response from upgrading one to one troupe', troupe);
          window.location.href = "/" + troupe.get('uri') + "#|share";
        }
      });
    }, 1000, true)

  });

var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options.title = 'Create a Troupe';
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
