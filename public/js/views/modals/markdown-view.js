"use strict";

var Marionette       = require('backbone.marionette');
var platformKeys     = require('utils/platform-keys');
var ModalView        = require('./modal');
var markdownTemplate = require('./tmpl/markdown-view.hbs');

var View = Marionette.ItemView.extend({
  template: markdownTemplate,

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'showKeyboardShortcuts':
        this.dialog.hide();
        window.location.hash = "#keys";
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  }
});

module.exports =  ModalView.extend({
    initialize: function(options) {
      options.title = "Markdown Help";
      ModalView.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    },
    menuItems: [
      { action: "cancel", text: "Close", className: "modal--default__footer__btn--neutral" },
      {
        action: "showKeyboardShortcuts",
        text: "Keyboard shortcuts ("+ platformKeys.cmd +" + "+ platformKeys.gitter +" + k)",
        className: "modal--default__footer__btn"
      }
    ]
  });
