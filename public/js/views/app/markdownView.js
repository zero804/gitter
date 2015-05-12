"use strict";
var Marionette = require('backbone.marionette');
var platformKeys = require('utils/platform-keys');
var ModalView = require('views/modal');
var markdownTemplate = require('./tmpl/markdownTemplate.hbs');

module.exports = (function() {


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

  return ModalView.extend({
      initialize: function(options) {
        options.title = "Markdown Help";
        ModalView.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      menuItems: [
        { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
        { action: "showKeyboardShortcuts", text: "Keyboard shortcuts ("+ platformKeys.cmd +" + "+ platformKeys.gitter +" + k)", className: "trpBtnBlue trpBtnRight"}
      ]
    });

})();
