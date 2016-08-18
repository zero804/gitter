'use strict';

var Marionette = require('backbone.marionette');
var $ = require('jquery');
var modalRegion = require('../../components/modal-region');
var UserhomeView = require('views/userhome/userHomeView');

//TODO Move this into the upper js container
//var appEvents    = require('../../utils/appevents');
//var troupes      = require('../../collections/instances/troupes').troupes;
//var RoomMenuLayout = require('../menu/room/layout/room-menu-layout');

var TroupeMenu = require('views/menu/old/troupeMenu');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      menu: { el: '#menu-region', init: 'initMenuRegion' },
      userhome: { el: '#userhome-region', init: 'initUserhomeRegion' },

      //Left Menu
      //roomMenu: { el: '#room-menu-container', init: 'initMenuRegion' }
    },
  },

  //TODO REMOVE WITH LEFT MENU
  // -------------------------------------------------
  ui: {
    mainPage: '#mainPage',
    showTroupesButton: '#showTroupesButton',
  },

  events: {
    'click @ui.mainPage': 'hideTroupes',
    'click @ui.showTroupesButton': 'showHideTroupes',
  },

  initialize: function() {
    this.dialogRegion = modalRegion;
  },

  onRender: function() {
    this.ui.showTroupesButton.toggle(!this.options.hideMenu);
  },

  initMenuRegion: function(optionsForRegion) {
    return new TroupeMenu(optionsForRegion());
  },
  hideTroupes: function() {
    this.makeAppFullScreen();
    this.ui.mainPage.removeClass('partiallyOffScreen');
  },

  makeAppFullScreen: function() {
    $('html, body').scrollTop($(document).height());
  },

  showHideTroupes: function(e) {
    this.makeAppFullScreen();
    this.ui.mainPage.toggleClass('partiallyOffScreen');
    e.stopPropagation();
  },
  // End Old Stuffs
  // -------------------------------------------------

  initUserhomeRegion: function(optionsForRegion) {
    return new UserhomeView(optionsForRegion());
  },

  //initMenuRegion: function(optionsForRegion) {
  //  return new RoomMenuLayout(optionsForRegion({ bus: appEvents, roomCollection: troupes }));
  //},

});
