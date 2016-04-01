'use strict';

var $                 = require('jquery');
var Marionette        = require('backbone.marionette');
var RoomMenuModel     = require('../../../../models/room-menu-model');
var MiniBarView       = require('../minibar/minibar-view');
var PanelView         = require('../panel/panel-view');
var context           = require('utils/context');
var DNDCtrl           = require('../../../../components/menu/room/dnd-controller');
var MinibarCollection = require('../minibar/minibar-collection');
var context           = require('utils/context');
var _                 = require('underscore');
var fastdom           = require('fastdom');

var MINIBAR_ITEM_HEIGHT = 65;

require('nanoscroller');

var MENU_HIDE_DELAY = 200;

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      minibar: { el: '#minibar', init: 'initMiniBar' },
      panel: { el: '#room-menu__panel', init: 'initMenuPanel' },
    },
  },

  initMiniBar: function(optionsForRegion) {
    var orgsSnapshot = context.getSnapshot('orgs') || [];
    return new MiniBarView(optionsForRegion({
      model:          this.model,
      collection:     new MinibarCollection(orgsSnapshot, { roomCollection: this.roomCollection }),
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
    }));
  },

  initMenuPanel: function(optionsForRegion) {
    return new PanelView(optionsForRegion({
      model:   this.model,
      bus:     this.bus,
      dndCtrl: this.dndCtrl,
    }));
  },

  ui: {
    minibar:     '#minibar',
    minibarList: '#minibar-list',
    panel:       '#panel',
  },

  events: {
    mouseenter: 'openPanel',
    mouseleave: 'closePanel',
  },

  childEvents: {
    render: 'onChildRender',
  },

  initialize: function(attrs) {

    //Event Bus
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus needs to be passed to a new instance of RoomMenuLayout');
    }

    this.bus   = attrs.bus;

    //Room Collection
    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid room collection needs to be passed to a new instance of RoomMenyLayout');
    }

    this.roomCollection          = attrs.roomCollection;

    //TODO TEST THIS & FIGURE OUT IF THEY ARE REQUIRED FOR MOBILE?
    //JP 28/1/16
    this.orgCollection           = attrs.orgCollection;
    this.suggestedRoomCollection = attrs.suggestedRoomCollection;

    //Menu Hide Delay
    this.delay = MENU_HIDE_DELAY;

    //Make a new model
    this.model = new RoomMenuModel(_.extend({}, context.getSnapshot('leftMenu'), {
      bus:                     this.bus,
      roomCollection:          this.roomCollection,
      orgCollection:           this.orgCollection,
      userModel:               context.user(),
      troupeModel:             context.troupe(),

      //TODO id this the best way to do this? JP 12/1/16
      isMobile:                $('body').hasClass('mobile'),
    }));

    //Make a new drag & drop control
    this.dndCtrl = new DNDCtrl({ model: this.model });

    window.addEventListener('resize', this._initNano.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:end-drag',   this.onDragEnd.bind(this));
    this.listenTo(this.bus,     'panel:render',   this.onPanelRender, this);

    //this.$el.find('#searc-results').show();
  },

  onDragStart: function() {
    this.model.set('roomMenuWasPinned', this.model.get('roomMenuIsPinned'));
    this.model.set('roomMenuIsPinned', true);
    this.openPanel();
  },

  onDragEnd: function() {
    if (!this.model.get('roomMenuWasPinned')) {
      this.model.set('roomMenuIsPinned', false);
    }

    this.openPanel();
  },

  openPanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return; }

    this.model.set('panelOpenState', true);
    if (this.timeout) { clearTimeout(this.timeout); }
  },

  closePanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return; }

    this.timeout = setTimeout(function() {
      this.model.set('panelOpenState', false);
    }.bind(this), this.delay);

  },

  onChildRender: function () {
    this._initNano();
  },

  onPanelRender: function () {
    this._initNano();
  },

  _initNano: _.debounce(function () {
    var params = { sliderMaxHeight: 100, iOSNativeScrolling: true };
    fastdom.mutate(function() {

      //init panel && minibar scrollers
      this.ui.panel.nanoScroller(params);
      this.ui.minibar.nanoScroller(params);

      //because of the margins nanoScroller will never show the scroller
      //so here is some custom logic to work around it
      var minibarItems       = this.minibar.currentView.collection.length;
      var minibarItemsHeight = (minibarItems * MINIBAR_ITEM_HEIGHT);
      fastdom.measure(function() {
        var minibarContainerHeight = this.ui.minibarList.height();
        if (minibarItemsHeight > minibarContainerHeight) {
          fastdom.mutate(function(){
            //
            //if the combined height of the minibar items is greater
            //than the minibar container's height show the scrollbar
            this.ui.minibar.find('.nano-pane').show();
          }.bind(this));
        }
      }.bind(this));
    }.bind(this));
  }, 500),

  onDestroy: function() {
    window.removeEventListener('resize', this._initNano.bind(this));
    this.stopListening(this.dndCtrl);
  },

});
