"use strict";
var Marionette  = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var appEvents   = require('utils/appevents');

//OLD LEFT MENU
var TroupeMenu = require('views/menu/old/troupeMenu');

//NEW LEFT MENU
var RoomMenuLayout    = require('../menu/room/layout/room-menu-layout');

var oldIsoProps = {
  menu: { el: "#menu-region", init: 'initMenuRegion' }
  //RoomMenuLayout: { el: '#room-menu-container', init: 'initNewMenuRegion' }
};

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
        //RoomMenuLayout: { el: '#room-menu-container', init: 'initNewMenuRegion' }
      },
    },

    events: {
      "keydown": "onKeyDown"
    },

    initialize: function (options) {
      this.roomCollection          = options.roomCollection;
      this.orgCollection           = options.orgCollection;
      this.dialogRegion            = modalRegion;
    },

    initMenuRegion: function (optionsForRegion){
      console.log('returning new troupe menu');
      return new TroupeMenu(optionsForRegion());
    },

    initNewMenuRegion: function (optionsForRegion){
      return new RoomMenuLayout(optionsForRegion({
        bus:                     appEvents,
        roomCollection:          this.roomCollection,
        orgCollection:           this.orgCollection
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
