'use strict';

var _ = require('underscore');
var $ = require('jquery');
var Marionette = require('backbone.marionette');
var fastdom = require('fastdom');
var context = require('utils/context');
var DNDCtrl = require('components/menu/room/dnd-controller');
var localStore = require('components/local-store');
var toggleClass = require('utils/toggle-class');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var KeyboardEventMixin = require('views/keyboard-events-mixin');

var RoomMenuModel = require('../../../../models/room-menu-model');
var MiniBarView = require('../minibar/minibar-view');
var PanelView = require('../panel/panel-view');
var MinibarCollection = require('../minibar/minibar-collection');
var KeyboardControllerView = require('../keyboard-controller/keyboard-controller-view');

var MINIBAR_ITEM_HEIGHT = 65;

require('nanoscroller');
require('views/behaviors/isomorphic');


var RoomMenuLayoutView = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      minibar: { el: '.minibar-inner', init: 'initMiniBar' },
      panel: { el: '#room-menu__panel', init: 'initMenuPanel' },
    },
  },

  initMiniBar: function(optionsForRegion) {
    return new MiniBarView(optionsForRegion({
      model:          this.model,
      collection:     this.model.minibarCollection,
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
      keyboardControllerView: this.keyboardControllerView
    }));
  },

  initMenuPanel: function(optionsForRegion) {
    return new PanelView(optionsForRegion({
      model:   this.model,
      bus:     this.bus,
      dndCtrl: this.dndCtrl,
      keyboardControllerView: this.keyboardControllerView
    }));
  },

  ui: {
    minibar:      '#minibar',
    minibarInner: '.minibar-inner',
    minibarList:  '#minibar-list',
    panel:        '#panel',
  },

  events: {
    mouseleave: 'onMouseLeave'
  },

  childEvents: {
    render: 'onChildRender',
  },

  initialize: function(attrs) {

    //Event Bus
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus needs to be passed to a new instance of RoomMenuLayout');
    }

    //Room Collection
    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid room collection needs to be passed to a new instance of RoomMenyLayout');
    }

    this.bus = attrs.bus;
    this.roomCollection = attrs.roomCollection;
    this.orgCollection = attrs.orgCollection;
    this.suggestedRoomCollection = attrs.suggestedRoomCollection;

    //Make a new model
    this.dndCtrl = new DNDCtrl();
    this.model = new RoomMenuModel(_.extend({}, context.getSnapshot('leftMenu'), {
      bus:                     this.bus,
      roomCollection:          this.roomCollection,
      orgCollection:           this.orgCollection,
      userModel:               context.user(),
      troupeModel:             context.troupe(),
      dndCtrl:                 this.dndCtrl,
    }));

    this.keyboardControls = new KeyboardControllerView({
      model: this.model,
    });

    window.addEventListener('resize', this._initNano.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd.bind(this));
    this.listenTo(this.bus, 'panel:render', this.onPanelRender, this);

    //this.$el.find('#searc-results').show();

    // Keeps track of the unload time so we can kinda detect if a refresh happened.
    // We use this information with the left-menu state rehrydration

    window.addEventListener('beforeunload', this.onPageUnload);
  },

  onPageUnload: function() {
    var timeAtUnload = new Date().getTime();
    document.cookie = 'previousUnloadTime=' + timeAtUnload + '; path=/';
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

  onMouseLeave: function() {
    this.closePanel();

    // Clear out the active selected state
    if(!this.model.get('roomMenuIsPinned')) {
      var activeModel = this.minibarCollection.findWhere({ active: true });
      if (activeModel) {
        activeModel.set('active', false);
      }
    }
  },

  openPanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return; }

    this.model.set('panelOpenState', true);
    if (this.timeout) { clearTimeout(this.timeout); }
  },

  closePanel: function() {
    if (this.model.get('roomMenuIsPinned')) { return; }

    this.model.set('panelOpenState', false);
  },

  onRender: function() {
    toggleClass(this.ui.minibarInner[0], 'has-community-create', context.hasFeature('community-create'));
  },

  onChildRender: function () {
    this._initNano();
  },

  onPanelRender: function () {
    this._initNano();
  },

  _initNano: _.debounce(function () {
    var params = {
      sliderMaxHeight: 100,
      iOSNativeScrolling: true,
      // We don't want the scroll container tabbable
      tabIndex: 'null'
    };
    fastdom.mutate(function() {

      //init panel && minibar scrollers
      this.ui.panel.nanoScroller(params);
      this.ui.minibarInner.nanoScroller(params);

      //because of the margins nanoScroller will never show the scroller
      //so here is some custom logic to work around it
      var minibarItems = this.minibar.currentView.collection.length;
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
    window.removeEventListener('beforeunload', this.onPageUnload);
    window.removeEventListener('resize', this._initNano.bind(this));
    this.stopListening(this.dndCtrl);
  },

  getModel: function (){
    return this.model;
  },

});


module.exports = RoomMenuLayoutView;
