"use strict";

var Marionette   = require('backbone.marionette');
var modalRegion  = require('components/modal-region');
var UserhomeView = require('views/userhome/userHomeView');
var appEvents    = require('../../utils/appevents.js');
//TODO Move this into the upper js container
var troupes      = require('../../collections/instances/troupes').troupes;
var RoomMenuView = require('../menu/room-menu-view');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      userhome: { el: '#userhome-region', init: 'initUserhomeRegion' },
      roomMenu: { el: '#room-menu-container', init: 'initMenuRegion' }
    }
  },

  initialize: function() {
    this.dialogRegion = modalRegion;
  },

  initUserhomeRegion: function(optionsForRegion) {
    return new UserhomeView(optionsForRegion());
  },

  initMenuRegion: function(optionsForRegion) {
    return new RoomMenuView(optionsForRegion({ bus: appEvents, roomCollection: troupes }));
  }

});
