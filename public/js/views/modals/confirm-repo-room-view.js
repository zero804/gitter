"use strict";

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var ModalView = require('./modal');
var template = require('./tmpl/confirm-repo-room.hbs');

var View = Marionette.ItemView.extend({
  template: template,

  modelEvents: {
    change: 'render'
  },

  ui: {
    'modalFailure': '#modal-failure',
    'addBadge': '.js-add-badge'
  },

  initialize: function(options) {
    var isOrg = options.uri.split('/').length === 1;
    this.model = new Backbone.Model({ uri: options.uri, isOrg: isOrg });
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'create':
        this.createRoom();
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  createRoom: function() {
    var self = this;
    var addBadge = this.ui.addBadge.prop('checked');

    self.ui.modalFailure.hide();
    var uri = self.model.get('uri');

    apiClient.post('/v1/rooms', { uri: uri, addBadge: addBadge })
      .then(function () {
        if (self.dialog) { self.dialog.hide(); }
        appEvents.trigger('navigation', '/' + uri, 'chat', uri, null);
      })
      .catch(function (/*err*/) {
        self.model.set('error', 'Unable to create room');
        self.ui.modalFailure.show('fast');
        // Do something here.
      });
  }

});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Create Room for " + options.uri;

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: [
    { action: "cancel", text: "Cancel", pull: 'left', className: "modal--default__footer__btn--neutral"},
    { action: "create", text: "Create", pull: 'right', className: "modal--default__footer__btn" },
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};
