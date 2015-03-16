"use strict";
var Marionette = require('backbone.marionette');
var TroupeMenuView = require('views/menu/troupeMenu');
var modalRegion = require('components/modal-region');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.ItemView.extend({

    el: 'body',

    events: {
      "keydown": "onKeyDown"
    },

    initialize: function () {
      this.bindUIElements();
      this.menu = new TroupeMenuView({ el: this.$el.find('#menu') }).show();
      this.dialogRegion = modalRegion;
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

