'use strict';

var Marionette    = require('backbone.marionette');
var RoomMenuModel = require('../../../../models/room-menu-model');
var MiniBarView   = require('../minibar/minibar-view');
var PanelView     = require('../panel/panel-view');
var context       = require('utils/context');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      minibar: { el: '#minibar', init: 'initMiniBar' },
      panel: { el: '#room-menu__panel', init: 'initMenuPanel' }
    }
  },

  initMiniBar: function (optionsForRegion){
    return new MiniBarView(optionsForRegion({ model: this.model }));
  },

  initMenuPanel: function(optionsForRegion){
    return new PanelView(optionsForRegion({ model: this.model, bus: this.bus }));
  },

  initialize: function (attrs){
    this.bus = attrs.bus;
    this.model   = new RoomMenuModel({
      bus: this.bus,
      roomCollection: attrs.roomCollection,
      userModel: context.user(),
    });
  },
});
