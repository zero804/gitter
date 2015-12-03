'use strict';

var Marionette    = require('backbone.marionette');
var RoomMenuModel = require('../../models/room-menu-model');
var MiniBarView   = require('./minibar-view');
var PanelView     = require('./panel-view');

module.exports = Marionette.ItemView.extend({

  constructor: function(attrs) {

    //objects
    this.model   = new RoomMenuModel({ bus: attrs.bus, roomCollection: attrs.roomCollection });
    this.minibar = new MiniBarView({ el: '#minibar', model: this.model });
    this.panel   = new PanelView({ el: '#room-menu__panel', model: this.model });

    //events
    this.listenTo(this.minibar, 'minibar:clicked', this.onMiniBarClicked, this);

    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  onMiniBarClicked: function(type) {
    this.model.set({ panelOpenState: true, profileMenuOpenState: false });
    this.model.setState(type);
  },

  destroy: function() {
    this.stopListening(this.minibar);
    Marionette.ItemView.prototype.destroy.apply(this, arguments);
  },

});
