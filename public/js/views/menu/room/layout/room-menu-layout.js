'use strict';

var $             = require('jquery');
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
      panel: { el: '#room-menu__panel', init: 'initMenuPanel' },
    },
  },

  initMiniBar: function(optionsForRegion) {
    return new MiniBarView(optionsForRegion({
      model: this.model,
      bus: this.bus
    }));
  },

  initMenuPanel: function(optionsForRegion) {
    return new PanelView(optionsForRegion({
      model: this.model,
      bus: this.bus
    }));
  },

  events: {
    'mouseenter': 'openPanel',
    'mouseleave': 'closePanel',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;

    var isPinned = $('.app-layout').hasClass('pinned');
    this.model   = new RoomMenuModel({
      bus:              this.bus,
      roomCollection:   attrs.roomCollection,
      userModel:        context.user(),

      //Is this the right way to do this?? JP 15/12/15
      roomMenuIsPinned: isPinned,
      panelOpenState:   isPinned
    });

    this.listenTo(this.bus, 'room-menu:start-drag', this.onDragStart.bind(this));
    this.listenTo(this.bus, 'room-menu:finish-drag', this.onDragEnd.bind(this));
  },

  //TODO Test this  jp 16/12/15
  onDragStart: function (){
    this.model.set('roomMenuIsPinned', true);
    this.openPanel();
  },

  //TODO Test this  jp 16/12/15
  onDragEnd: function (){
    this.model.set('roomMenuIsPinned', false);
    this.openPanel();
  },

  //TODO Test this  jp 16/12/15
  openPanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return }
    this.model.set('panelOpenState', true);
    if (this.timeout) { clearTimeout(this.timeout); }
  },

  //TODO Test this  jp 16/12/15
  closePanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return }
    this.timeout = setTimeout(function() {
      this.model.set('panelOpenState', false);
    }.bind(this), localStorage.delay);

  },

});
