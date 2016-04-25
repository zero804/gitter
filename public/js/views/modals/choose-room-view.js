"use strict";

var Marionette = require('backbone.marionette');
var ModalView  = require('./modal');
var template   = require('./tmpl/choose-room-view.hbs');
var context    = require('../../utils/context');


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

  serializeData: function() {
    return {
      allowCreate: this.options.allow,
      disallowCreateReason: this.options.reason
    };
  }

});

var Modal = ModalView.extend({
  disableAutoFocus: true,
  initialize: function(options) {
    options = options || {};
    options.title = options.title || "Create a chat room";

    var providers = context.user().get('providers');
    options.allow = providers.indexOf('github') !== -1;
    // This way we don't have to figure out how to dynamically map linkedin to
    // LinkedIn and it is future-proof (works for all non-github) AND it tells
    // you how to work around this. (ie. sign in with a github account).
    options.reason = (options.allow) ? '' : 'Sorry, only GitHub users can create rooms at the moment.';

    if (options.allow) {
      this.menuItems = [
        { action: "next", text: "Next", className: "modal--default__footer__btn" },
      ]
    } else {
      this.menuItems = [];
    }

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  },
});

module.exports = {
  View: View,
  Modal: Modal
};
