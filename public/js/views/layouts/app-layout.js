"use strict";
var Marionette  = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var appEvents   = require('utils/appevents');

//OLD LEFT MENU
var TroupeMenu = require('views/menu/old/troupeMenu');
var context    = require('utils/context');
var isMobile   = require('utils/is-mobile');

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

    behaviors: function(){
      if(isMobile() || !context.hasFeature('left-menu')) {
        return { Isomorphic: {
          menu: { el: "#menu-region", init: 'initMenuRegion' }
        }};
      }
      else {
        return { Isomorphic: {
          RoomMenuLayout: { el: '#room-menu-container', init: 'initNewMenuRegion' }
        }};
      }
    },

    events: {
      "keydown": "onKeyDown",
    },

    initialize: function (options) {
      this.roomCollection          = options.roomCollection;
      this.orgCollection           = options.orgCollection;
      this.dialogRegion            = modalRegion;

      //Mobile events don't seem to bind 100% of the time so lets use a native method
      var menuHotspot = document.querySelector('.menu__hotspot');
      if(menuHotspot) {
        menuHotspot.addEventListener('click', function(){
          this.fireEventToggleMobileMenu();
        }.bind(this));
      }
    },

    initMenuRegion: function (optionsForRegion){
      return new TroupeMenu(optionsForRegion());
    },

    initNewMenuRegion: function (optionsForRegion){
      this.menuRegion =  new RoomMenuLayout(optionsForRegion({
        bus:                     appEvents,
        roomCollection:          this.roomCollection,
        orgCollection:           this.orgCollection
      }));
      return this.menuRegion;
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
    }

  });

  return AppIntegratedLayout;

})();
