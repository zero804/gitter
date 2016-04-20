'use strict';

var _                 = require('underscore');
var $                 = require('jquery');
var Marionette        = require('backbone.marionette');
var fastdom           = require('fastdom');
var context           = require('utils/context');
var DNDCtrl           = require('components/menu/room/dnd-controller');
var localStore        = require('components/local-store');
var RoomMenuModel     = require('../../../../models/room-menu-model');
var MiniBarView       = require('../minibar/minibar-view');
var PanelView         = require('../panel/panel-view');
var MinibarCollection = require('../minibar/minibar-collection');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');

var MINIBAR_ITEM_HEIGHT = 65;

require('nanoscroller');
require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  behaviors: {
    Isomorphic: {
      minibar: { el: '.minibar-inner', init: 'initMiniBar' },
      panel: { el: '#room-menu__panel', init: 'initMenuPanel' },
    },
  },

  initMiniBar: function(optionsForRegion) {
    return new MiniBarView(optionsForRegion({
      model:          this.model,
      collection:     this.minibarCollection,
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

    var orgsSnapshot = context.getSnapshot('orgs') || [];
    this.minibarCollection = new MinibarCollection(orgsSnapshot, { roomCollection: this.roomCollection });

    var leftMenuSnapshot = context.getSnapshot('leftMenu');

    //Make a new model
    this.model = new RoomMenuModel(_.extend({}, leftMenuSnapshot, {
      bus:                     this.bus,
      roomCollection:          this.roomCollection,
      orgCollection:           this.orgCollection,
      userModel:               context.user(),
      troupeModel:             context.troupe(),

      //TODO id this the best way to do this? JP 12/1/16
      isMobile:                $('body').hasClass('mobile'),
    }));
    this.resolvePageLoadedState();

    //Make a new drag & drop control
    this.dndCtrl = new DNDCtrl({ model: this.model });

    window.addEventListener('resize', this._initNano.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart.bind(this));
    this.listenTo(this.dndCtrl, 'dnd:end-drag',   this.onDragEnd.bind(this));
    this.listenTo(this.bus,     'panel:render',   this.onPanelRender, this);

    //this.$el.find('#searc-results').show();
  },

  resolvePageLoadedState: function() {
    var timeNow = new Date().getTime();
    var previousLocationHref = localStore.get('previousLocationHref');
    var previousLocationUnloadTime = localStore.get('previousLocationUnloadTime');
    var currentLocationHref = window.location.href;
    // Set it for next time
    window.onbeforeunload = function(e) {
      localStore.set('previousLocationHref', currentLocationHref);
      var timeAtUnload = new Date().getTime();
      localStore.set('previousLocationUnloadTime', timeAtUnload);
    };

    var currentState = this.model.get('state');
    var currentlySelectedOrg = this.model.get('selectedOrgName');
    // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
    var isWithinRefreshTimeThreshold = previousLocationUnloadTime && (timeNow - previousLocationUnloadTime) < 5000;

    // If most-likely was not refresh because timing
    // and they came through a link(because referrer).
    // note: `document.referrer` is sticky through refreshes
    var didComeThroughLinkOutsideApp = !isWithinRefreshTimeThreshold && document.referrer.length > 0;
    // If they navigated to a completely separate URL than what we have saved
    // And they they don't have a referrer meaning they navigated directly most likely
    var didNavigateDirectly =  (!isWithinRefreshTimeThreshold || currentLocationHref !== previousLocationHref) && document.referrer.length === 0;

    if(didComeThroughLinkOutsideApp || didNavigateDirectly) {
      currentState = 'org';
      currentlySelectedOrg = getOrgNameFromTroupeName(context.troupe().get('uri'));
    }

    this.model.set({
      state: currentState,
      selectedOrgName: currentlySelectedOrg
    });
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
      this.ui.minibarInner.nanoScroller(params);

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

  getModel: function (){
    return this.model;
  },

});
