'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var fastdom       = require('fastdom');
var ItemView      = require('./minibar-item-view');
var CloseItemView = require('./minibar-close-item-view');
var CommunityCreateItemView = require('./minibar-community-create-item-view');
var FavouriteView = require('./minibar-favourite-item-view');
var PeopleView    = require('./minibar-people-item-view.js');
var domIndexById  = require('../../../../utils/dom-index-by-id');

//TODO TEST ALL THE THINGS JP 2/2/16
var MinibarView = Marionette.CollectionView.extend({
  tagName:   'ul',
  id:        'minibar-list',
  childView: ItemView,
  childEvents: {
    'minibar-item:keyboard-activated': 'onItemKeyboardActivated',
    'minibar-item:activated': 'onItemActivated',
    'minibar-item:close':   'onCloseClicked',
  },

  //if an element exists in the dom pass that as the el prop
  childViewOptions: function(model, index) {
    //
    //use different selectors for orgs
    var selector = (model.get('type') === 'org') ?
      'minibar-' + model.get('name') :
      'minibar-' + model.get('type');

    var element = this.domMap[selector];
    var opts = {
      index: index,
      model: model,
      roomMenuModel: this.model
    };
    if(!!element) {
      opts.el = element;
    }

    return opts;
  },

  buildChildView: function(model, ViewClass, options) {

    //construct the default options
    var viewOptions = _.extend({}, options, { model: model });

    //construct specialist view for close button
    switch (model.get('type')) {
      case 'close':
        viewOptions = _.extend(viewOptions, { roomModel: this.model });
        return new CloseItemView(viewOptions);
      case 'community-create':
        return new CommunityCreateItemView(viewOptions);
      case 'favourite':
        viewOptions = _.extend(viewOptions, { dndCtrl: this.dndCtrl });
        return new FavouriteView(viewOptions);
      case 'people':
        viewOptions = _.extend(viewOptions, { roomCollection: this.roomCollection });
        return new PeopleView(viewOptions);
      default:
        return new ViewClass(viewOptions);
    }

  },

  initialize: function(attrs) {
    this.bus            = attrs.bus;
    this.dndCtrl        = attrs.dndCtrl;
    this.model          = attrs.model;
    this.roomCollection = attrs.roomCollection;
    this.keyboardControllerView = attrs.keyboardControllerView;

    this.shouldRender   = false;

    this.listenTo(this.roomCollection, 'add remove', this.render, this);
    this.listenTo(this.collection, 'snapshot', this.onCollectionSnapshot, this);
    this.listenTo(this.model, 'change:state change:selectedOrgName', this.onMenuStateUpdate, this);
    this.onMenuStateUpdate();

    this.keyboardControllerView.inject(this.keyboardControllerView.constants.MINIBAR_KEY, [
      { collection: this.collection }
    ]);

    // For the normal arrowing through
    // when we have too many rooms to render instantly
    this.debouncedOnItemActivated = _.debounce(this.onItemActivated, 300);
    // Just for the quick flicks
    this.shortDebouncedOnItemActivated = _.debounce(this.onItemActivated, 100);

    //Guard against not getting a snapshot
    this.timeout = setTimeout(function() {
      this.onCollectionSnapshot();
    }.bind(this), 2000);
  },

  onBeforeRender: function () {
    this.domMap = domIndexById(this.el);
  },

  render: function() {
    return this.shouldRender ? Marionette.CollectionView.prototype.render.apply(this, arguments) : null;
  },

  onCollectionSnapshot: function() {
    clearTimeout(this.timeout);

    //Only render after a snapshot
    this.shouldRender = true;
    fastdom.mutate(function() {
      this.render();
    }.bind(this));
  },


  onItemActivated: function(view, model, activationSourceType) {
    var modelName = model.get('name');

    //stop selectedOrg name from changing if it does not need to
    if (modelName === 'all' || modelName === 'search' || modelName === 'favourite' || modelName === 'people') {
      modelName = this.model.get('name');
    }

    // Set the minibar-item active
    model.set({
      active: true
    });

    var state = model.get('type');
    // close-passthrough
    // Don't change the state when we focus/activate the `close`/toggle icon
    if(state !== 'close') {
      // Update the minibar state
      this.model.set({
        panelOpenState:       true,
        state:                state,
        profileMenuOpenState: false,
        selectedOrgName:      modelName,
        activationSourceType: activationSourceType
      });
    }
  },

  onItemKeyboardActivated: function(view, model) {
    // Arbitrary threshold based on when we can't render "instantly".
    // We don't want to delay too much because majority of users won't run into render shortcomings
    // and the delay could cause confusion for screen-reader users not recnogizing when
    // the switch happens
    if(this.roomCollection.length > 50) {
      this.debouncedOnItemActivated(view, model, 'keyboard');
    }
    else {
      this.shortDebouncedOnItemActivated(view, model, 'keyboard');
    }
  },

  onMenuStateUpdate: function() {
    this.updateMinibarActiveState(this.model.get('state'), this.model.get('selectedOrgName'));
  },

  onCloseClicked: function() {
    var newVal = !this.model.get('roomMenuIsPinned');
    var ANIMATION_TIME = 300;

    //if we are opening the panel
    if (newVal === true) {
      if (this.model.get('panelOpenState') === true) {
        this.model.set({ roomMenuIsPinned: newVal });
        this.bus.trigger('room-menu:pin', newVal);
      } else {
        // We stagger the trigger here so we don't jank the UI
        // resizing the the left-menu and main chat-frame
        setTimeout(function() {
          this.model.set({ roomMenuIsPinned: newVal });
          this.bus.trigger('room-menu:pin', newVal);
        }.bind(this), ANIMATION_TIME);
      }

      this.model.set({ panelOpenState: newVal });
    }

    //
    else {
      this.model.set({ roomMenuIsPinned: newVal });
      this.bus.trigger('room-menu:pin', newVal);
      // We stagger the trigger here so we don't jank the UI
      // resizing the the left-menu and main chat-frame
      setTimeout(function() {
        this.model.set({ panelOpenState: newVal });
      }.bind(this), ANIMATION_TIME);
    }

  },

  onDestroy: function () {
    this.stopListening(this.collection);
    this.stopListening(this.model);
    this.stopListening(this.roomCollection);
  },


  updateMinibarActiveState: function(currentState, selectedOrgName) {
    // Reset the currently active model
    var activeModels = this.collection.where({ active: true });
    if (activeModels) {
      activeModels.forEach(function(model) {
        model.set('active', false);
      });
    }

    // Activate the new model
    var nextActiveModel = (currentState !== 'org') ?
      this.collection.findWhere({ type: currentState }) :
      this.collection.findWhere({ name: selectedOrgName });

    if (nextActiveModel) {
      nextActiveModel.set('active', true);
    }
  }


});


module.exports = MinibarView;
