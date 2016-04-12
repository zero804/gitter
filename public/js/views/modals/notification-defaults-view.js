"use strict";

var Marionette        = require('backbone.marionette');
var _                 = require('underscore');
var apiClient         = require('components/apiClient');
var ModalView         = require('./modal');
var template          = require('./tmpl/notification-defaults.hbs');
var FeaturesView      = require('./notification-features-collection-view');

var View = Marionette.LayoutView.extend({
  template: template,
  events: {
    'click #close-settings' : 'destroySettings',
    'change #notification-options' : 'formChange'
  },
  modelEvents: {
    change: 'update'
  },
  ui: {
    options: '#notification-options',
    notifyFeatures: '#notify-features'
  },
  regions: {
    notifyFeatures: '#notify-features'
  },

  initialize: function() {
    // TODO: this should go to the userRoom endpoint as a get
    // or better yet should be a live field on the room
    apiClient.user.get('/settings/defaultRoomMode')
      .bind(this)
      .then(function(settings) {
        this.model.set(settings);
      });

    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  update: function() {
    var selectInput = this.ui.options;
    selectInput.val(this.model.get('mode'));

    var count = 0;
    if(this.featuresView) {
      count = this.featuresView.resetFromHash(this.model.attributes);
    } else {
      count = 0;
    }

    if (count > 0) {
      this.ui.notifyFeatures.show();
    } else {
      this.ui.notifyFeatures.hide();
    }
  },

  onRender: function() {
    this.featuresView = new FeaturesView({ });
    this.getRegion('notifyFeatures').show(this.featuresView);
    this.update();
  },

  formChange: function(e) {
    if(e) e.preventDefault();
    var mode = this.ui.options.val();
    this.featuresView.resetFromMode(mode);

    var noChange = mode === this.model.get('mode');
    this.dialog.toggleButtonClass('apply', 'modal--default__footer__btn--neutral', noChange);
    this.dialog.toggleButtonClass('apply', 'modal--default__footer__btn', !noChange);
  },

  destroySettings : function () {
    this.dialog.hide();
    this.dialog = null;
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'override-all':
        this.overrideAllAndClose();
        break;
      case 'apply':
        this.applyChangeAndClose();
        break;
    }
  },

  overrideAllAndClose: function() {
    if (!window.confirm('Are you sure you want to change all your rooms to use your default?')) {
      return;
    }

    var mode = this.ui.options.val();
    apiClient.user.put('/settings/defaultRoomMode', { mode: mode, override: true })
      .bind(this)
      .then(function() {
        this.dialog.hide();
        this.dialog = null;
      });
  },

  applyChangeAndClose: function() {
    var mode = this.ui.options.val();

    apiClient.user.put('/settings/defaultRoomMode', { mode: mode })
      .bind(this)
      .then(function() {
        this.dialog.hide();
        this.dialog = null;
      });
  }
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options = _.extend({
        title: "Default Notification Settings",
        menuItems: [{
          action: 'override-all',
          pull: 'left',
          text: 'Override All',
          className: 'modal--default__footer__btn--negative'
        },{
          action: "apply",
          pull: 'right',
          text: "Apply",
          className: "modal--default__footer__btn--neutral"
        }]
      }, options);

      ModalView.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
});
