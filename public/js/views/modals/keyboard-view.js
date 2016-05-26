"use strict";

var Marionette = require('backbone.marionette');
var context = require('utils/context');
var appEvents = require('../../utils/appevents');
var platformKeys = require('utils/platform-keys');
var ModalView = require('./modal');
var keyboardTemplate = require('./tmpl/keyboard-view.hbs');

var View = Marionette.ItemView.extend({
  template: keyboardTemplate,

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'showMarkdownHelp':
        this.dialog.hide();
        window.location.hash = "#markdown";
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  serializeData: function() {
    return {
      hasLeftMenuFeature: context.hasFeature('left-menu'),

      shouldShowRoom2Keys: !!platformKeys.room2,
      cmdKey: platformKeys.cmd,
      roomKey: platformKeys.room,
      room2Key: platformKeys.room2,
      gitterKey: platformKeys.gitter
    };
  },
});

module.exports = ModalView.extend({
    initialize: function(options) {
      options.title = "Keyboard Shortcuts";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
      this.listenTo(this, 'hide', function() {
        appEvents.trigger('help.close');
      });
    },
    menuItems: [
      {
        action: "showMarkdownHelp",
        text: "Markdown Help ("+ platformKeys.cmd +" + "+ platformKeys.gitter +" + m)",
        className: "modal--default__footer__btn"
      }
    ]
  });
