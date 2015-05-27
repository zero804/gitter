"use strict";
var Marionette = require('backbone.marionette');
var TroupeMenu = require('views/menu/troupeMenu');
var modalRegion = require('components/modal-region');

require('views/behaviors/isomorphic');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {
        menu: { el: "#menu-region", init: 'initMenuRegion' }
      }
    },

    events: {
      "keydown": "onKeyDown"
    },

    initialize: function () {
      this.dialogRegion = modalRegion;
    },

    initMenuRegion: function(optionsForRegion) {
      return new TroupeMenu(optionsForRegion());
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
