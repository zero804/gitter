"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('../../components/modal-region');
var appEvents = require('../../utils/appevents');

//NEW LEFT MENU
var RoomMenuLayout = require('../menu/room/layout/room-menu-layout');

require('../behaviors/isomorphic');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {
        RoomMenuLayout: { el: '#room-menu-container', init: 'initMenuRegion' }
        // ...
      }
    },

    initMenuRegion: function(optionsForRegion) {
      this.menuRegion = new RoomMenuLayout(optionsForRegion({
        bus: appEvents,
        roomCollection: this.roomCollection,
        orgCollection: this.orgCollection,
        groupsCollection: this.groupsCollection
      }));
      return this.menuRegion;
    },

    events: {
      "keydown": "onKeyDown",
    },

    initialize: function(options) {
      this.roomCollection = options.roomCollection;
      this.orgCollection = options.orgCollection;
      this.groupsCollection = options.groupsCollection;
      this.dialogRegion = modalRegion;

      //Mobile events don't seem to bind 100% of the time so lets use a native method
      var menuHotspot = document.querySelector('.menu__hotspot');
      if(menuHotspot) {
        menuHotspot.addEventListener('click', function(){
          this.fireEventToggleMobileMenu();
        }.bind(this));
      }
    },


    onKeyDown: function(e) {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.keyCode === BACKSPACE) {
        e.stopPropagation();
        e.preventDefault();
      }
    },

    getRoomMenuModel: function (){
      if(!this.menuRegion) { return; }
      return this.menuRegion.getModel();
    },

    fireEventToggleMobileMenu: function() {
      appEvents.trigger('menu:show');
    },

  });

  return AppIntegratedLayout;

})();
