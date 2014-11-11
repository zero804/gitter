"use strict";
var Backbone = require('backbone');
var Marionette = require('marionette');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var TroupeViews = require('views/base');
var template = require('./tmpl/confirmRepoRoom.hbs');

module.exports = (function() {


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
      this.model = new Backbone.Model({ uri: options.uri });
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
          self.dialog.hide();
          appEvents.trigger('navigation', '/' + uri, 'chat', uri, null);
        })
        .fail(function (/*xhr*/) {
          self.model.set('error', 'Unable to create room');
          self.ui.modalFailure.show('fast');
          // Do something here.
        });
    }

  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create Room for " + options.uri;

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "create", text: "Create", className: "trpBtnGreen action" },
      { action: "cancel", text: "Cancel", className: "trpBtnLightGrey"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };


})();

