"use strict";
var Marionette  = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var RoomMenuLayout    = require('../menu/room/layout/room-menu-layout');
var appEvents   = require('utils/appevents');

require('views/behaviors/isomorphic');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {
        RoomMenuLayout: { el: '#room-menu-container', init: 'initMenuRegion' }
      }
    },

    events: {
      "keydown": "onKeyDown"
    },

    initialize: function (options) {
      this.roomCollection = options.roomCollection;
      this.dialogRegion = modalRegion;
    },

    initMenuRegion: function (optionsForRegion){
      return new RoomMenuLayout(optionsForRegion({
        bus: appEvents,
        roomCollection: this.roomCollection
      }));
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
