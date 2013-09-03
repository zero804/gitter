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

    resendConfirm: function() {
      var v = new SignupConfirmView({ email: this.model.get('email') });
      (new TroupeViews.Modal({ view: v })).show();
    },

    makePrimary: function() {

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
      'click #addEmailBtn': 'addEmail'
    },

    afterRender: function() {
      this.collectionView = new CollectionView({ collection: this.collection, el: this.$el.find("#emailCollectionView") });

      this.collectionView.render();
    },

    addEmail: function() {
      var m = new AddEmail.Modal({ collection: this.collection });
      this.dialog.transitionTo(m);
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