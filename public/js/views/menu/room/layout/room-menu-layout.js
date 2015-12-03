'use strict';

var Marionette    = require('backbone.marionette');
var RoomMenuModel = require('../../../../models/room-menu-model');
var MiniBarView   = require('../minibar/minibar-view');
var PanelView     = require('../panel/panel-view');

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
    return new PanelView(optionsForRegion({ model: this.model }));
  },

  initialize: function (attrs){
    this.model   = new RoomMenuModel({ bus: attrs.bus, roomCollection: attrs.roomCollection });
  },

});
