'use strict';

var $             = require('jquery');
var Marionette    = require('backbone.marionette');
var RoomMenuModel = require('../../../../models/room-menu-model');
var MiniBarView   = require('../minibar/minibar-view');
var PanelView     = require('../panel/panel-view');
var context       = require('utils/context');
var DNDCtrl       = require('../../../../components/menu/room/dnd-controller');

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
      bus: this.bus,
      dndCtrl: this.dndCtrl
    }));
  },

  initMenuPanel: function(optionsForRegion) {
    return new PanelView(optionsForRegion({
      model: this.model,
      bus: this.bus,
      dndCtrl: this.dndCtrl
    }));
  },

  events: {
    'mouseenter': 'openPanel',
    'mouseleave': 'closePanel',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    this.delay = localStorage.delay;

    var isPinned = $('.app-layout').hasClass('pinned');
    this.model  = new RoomMenuModel({
      bus:              this.bus,
      roomCollection:   attrs.roomCollection,
      userModel:        context.user(),

      //Is this the right way to do this?? JP 15/12/15
      roomMenuIsPinned: isPinned,
      panelOpenState:   isPinned
    });

    this.dndCtrl = new DNDCtrl({ model: this.model });

    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd.bind(this));
  },

  onDragStart: function (){
    this.model.set('roomMenuWasPinned', this.model.get('roomMenuIsPinned'));
    this.model.set('roomMenuIsPinned', true);
    this.openPanel();
  },

  onDragEnd: function (){
    if(!this.model.get('roomMenuWasPinned')){
      this.model.set('roomMenuIsPinned', false);
    }
    this.openPanel();
  },

  openPanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return }
    this.model.set('panelOpenState', true);
    if (this.timeout) { clearTimeout(this.timeout); }
  },

  closePanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return }
    this.timeout = setTimeout(function() {
      this.model.set('panelOpenState', false);
    }.bind(this), this.delay);

  },

});
