"use strict";

var Marionette = require('backbone.marionette');
var ModalView  = require('./modal');
var template   = require('./tmpl/choose-room-view.hbs');

var View = Marionette.ItemView.extend({
  template: template,

  ui: {
    radioCustom: 'input#radio-custom',
    radioRepo: 'input#radio-repo',
  },

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  menuItemClicked: function(button) {
    switch(button) {
      case 'next':
        if(this.ui.radioRepo[0].checked) {
          window.location.hash = "#createreporoom";
        }

        if(this.ui.radioCustom[0].checked) {
          window.location.hash = "#createcustomroom";
        }
        break;

      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

});

var Modal = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Create a chat room";

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
  menuItems: [
    { action: "cancel", text: "Cancel", className: "modal--default__footer__btn--neutral"},
    { action: "next", text: "Next", className: "modal--default__footer__btn" },
  ]
});

module.exports = {
  View: View,
  Modal: Modal
};
