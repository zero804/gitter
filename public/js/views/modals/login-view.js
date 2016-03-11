"use strict";

var $             = require('jquery');
var Marionette    = require('backbone.marionette');
var ModalView     = require('./modal');
var template      = require('./tmpl/login-view.hbs');

require('gitter-styleguide/css/components/buttons.css');


var View = Marionette.ItemView.extend({
  template: template,
  className: 'login-view',

  initialize: function() {
    this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
  },

  events: {
  },

  menuItemClicked: function(button) {
    switch (button) {
      case 'cancel':
        this.dialog.hide();
        break;
    }
  },

  serializeData: function() {
    return { };
  },

});

var Modal = ModalView.extend({
  initialize: function(options) {
    options = options || {};
    options.style = 'modal--default__narrow';

    ModalView.prototype.initialize.call(this, options);
    this.view = new View(options);
  }
});

module.exports = Modal;
