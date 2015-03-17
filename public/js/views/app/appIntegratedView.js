"use strict";
var Marionette = require('backbone.marionette');
var TroupeMenuView = require('views/menu/troupeMenu');
var modalRegion = require('components/modal-region');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.ItemView.extend({
    template: false, // Always server prerendered
    el: 'body',

    events: {
      "keydown": "onKeyDown"
    },

    ui: {
      menu: '#menu'
    },

    initialize: function () {
      this.dialogRegion = modalRegion;
    },

    onRender: function() {
      this.menu = new TroupeMenuView({
          template: false, // Server render here, just attach
          el: this.ui.menu
        })
        .render();
    },

    onKeyDown: function(e) {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.keyCode === BACKSPACE) {
        e.stopPropagation();
        e.preventDefault();
      }
    }

  });

  return AppIntegratedLayout;

})();
