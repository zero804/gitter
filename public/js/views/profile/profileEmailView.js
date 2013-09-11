/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'marionette',
  'utils/context',
  'views/base',
  './profileAddEmailView',
  'views/signup/signupModalConfirmView',
  'hbs!./tmpl/profileEmailView',
  'hbs!./tmpl/profileEmailItemView',
  'collections/useremails',
  'utils/validate-wrapper',
  'jquery-placeholder'  // No reference
], function($, _, Marionette, context, TroupeViews, AddEmail, SignupConfirmView, template, itemViewTemplate, collections, validation) {
  "use strict";

  // email item view
  var ItemView = TroupeViews.Base.extend({
    template: itemViewTemplate,
    tagName: "tr",

    events: {
      'click #deleteEmailBtn': 'deleteEmail',
      'click #resendConfirmBtn': 'resendConfirm',
      'click #makePrimaryBtn': 'makePrimary'
    },

    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      var isPrimary = this.model.get('status') === 'PRIMARY';
      var isUnconfirmed = this.model.get('status') === 'UNCONFIRMED';
      var isSecondary = !(isPrimary || isUnconfirmed);

      return _.extend(data, {
        isPrimary: isPrimary,
        isUnconfirmed: isUnconfirmed,
        isSecondary: isSecondary
      });
    },

    deleteEmail: function() {
      this.model.destroy();
    },

    resendConfirm: function(e) {
      if(e) e.preventDefault();
      var self = this;
       $.ajax({
        url: "/resendconfirmation",
        dataType: "json",
        data: {
          email: self.model.get('email')
        },
        type: "POST",
        success: function() {
          self.model.trigger('resend-success');
        }
      });

    },

    makePrimary: function() {
      var self = this;
      this.model.makePrimary({
        success: function() {
          self.model.trigger('makePrimary-success');
        }
      });
    }
  });

  // collection view
  var CollectionView = Marionette.CollectionView.extend({
    itemView: ItemView,
    //loadingView: TroupeViews.Base.extend({ template: function() { return "Loading"; } }),
    initialize: function() {
        this.collection.on('add', function() {

        });
    },

    onAfterItemAdded: function() {

    }
  });

  // modal view
  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      'click #addEmailBtn': 'addEmail',
      'click #backBtn': 'back'
    },

    initialize: function() {
      _.bindAll(this, 'showPrimarySuccess', 'showResendSuccess');
      this.collection.on('makePrimary-success', this.showPrimarySuccess);
      this.collection.on('resend-success', this.showResendSuccess);
    },

    afterRender: function() {
      this.collectionView = new CollectionView({ collection: this.collection, el: this.$el.find("#emailCollectionView") });

      this.collectionView.render();
    },

    addEmail: function() {
      var m = new AddEmail.Modal({ collection: this.collection });
      this.dialog.transitionTo(m);
    },

    showMessage: function(message) {
      this.$el.find('.trpModalSuccess').text(message).slideUp();
    },

    back: function() {
      window.location.href = '#|profile';
    },

    showPrimarySuccess: function() {
      this.showSuccess("Primary email address changed");
    },

    showResendSuccess: function() {
      this.showSuccess("We've email you to confirm the address");
    },

    showSuccess: function(msg) {
      var self = this;
      this.$el.find('.trpModalSuccess').text(msg).show({
        complete: function() {
          setTimeout(function() {
            self.$el.find('.trpModalSuccess').hide();
          }, 2000);
        }
      });
    }

  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {

      var collection = new collections.UserEmailCollection();
      collection.fetch();

      options.title = "Manage your email addresses";
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ collection: collection });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});