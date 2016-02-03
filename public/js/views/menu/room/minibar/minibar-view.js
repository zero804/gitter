'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var itemTemplate  = require('./minibar-item-view.hbs');
var closeTemplate = require('./minibar-close-item-view.hbs');
var RAF           = require('utils/raf');
var getRoomAvatar = require('utils/get-room-avatar');

var ItemView = Marionette.ItemView.extend({
  tagName:      'li',
  template:     itemTemplate,
  modelEvents: {
    'change:unreadItems change:mentions': 'render',
    'change:active': 'onActiveStateUpdate',
  },
  events: {
    'click': 'onItemClicked',
  },
  attributes: function() {
    var type = this.model.get('type');

    //account for initial render
    var className = 'room-menu-options__item--' + type;
    if (this.model.get('active')) { className = className += ' active'; }

    return {
      'class':             className,
      'data-state-change': type,
    };
  },

  serializeData: function() {
    var data = this.model.toJSON();
    var activity = (data.mentions || data.unreadItems) ? false : data.activity;
    return _.extend({}, data, {
      isHome:      (data.type === 'all'),
      isSearch:    (data.type === 'search'),
      isFavourite: (data.type === 'favourite'),
      isPeople:    (data.type === 'people'),
      isOrg:       (data.type === 'org'),
      avatarUrl:   getRoomAvatar(data.name),
      activity:    activity,
    });
  },

  onItemClicked: function() {
    this.trigger('minibar-item:clicked', this.model);
  },

  onActiveStateUpdate: function(model, val) { //jshint unused: true
    this.$el.toggleClass('active', !!val);
  },

  onRender: function() {
    this.$el.toggleClass('active', !!this.model.get('active'));
  },

});

var CloseItemView = ItemView.extend({
  template: closeTemplate,

  initialize: function(attrs) {
    this.roomModel = attrs.roomModel;
    this.listenTo(this.roomModel, 'change:panelOpenState change:roomMenuIsPinned', this.onPanelOpenChange, this);
  },

  onItemClicked: function() {
    this.trigger('minibar-item:close');
  },

  onPanelOpenChange: _.debounce(function() { //jshint unused: true
    var pinState  = this.roomModel.get('roomMenuIsPinned');
    var openState = this.roomModel.get('panelOpenState');

    //if the menu is open && pinned
    if (!!openState && !!pinState) {
      this.$el.addClass('left');
      this.$el.removeClass('right');
    }

    if (!!openState && !pinState) {
      this.$el.addClass('right');
      this.$el.removeClass('left');
    }

    if (!openState) {
      this.$el.removeClass('left');
      this.$el.removeClass('right');
    }
  }, 200),

  onDestroy: function() {
    this.stopListening(this.roomModel);
  },

});

var FavouriteView = ItemView.extend({
  initialize: function(attrs) {
    this.dndCtrl = attrs.dndCtrl;
    this.dndCtrl.pushContainer(this.el);
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragStop, this);
    this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavourite, this);
  },

  onDragStart: function() {
    this.$el.addClass('active');
  },

  onDragStop: function() {
    this.$el.removeClass('active');
  },

  onFavourite: function() {
    this.$el.addClass('dropped');
    setTimeout(function() {
      this.$el.removeClass('dropped');

      //Dragula places dropped items into the drop container
      //This needs to be fixed upstream
      //util that date just remove the dropped container manually
      //https://github.com/bevacqua/dragula/issues/188
      this.$el.find('.room-item').remove();
    }.bind(this), 200);
  },

  onDestroy: function() {
    this.stopListening(this.dndCtrl);
  },
});

//TODO TEST ALL THE THINGS JP 2/2/16
module.exports = Marionette.CollectionView.extend({
  tagName:   'ul',
  id:        'minibar-list',
  childView: ItemView,
  childEvents: {
    'minibar-item:clicked': 'onItemClicked',
    'minibar-item:close':   'onCloseClicked',
  },

  //if an element exists in the dom pass that as the el prop
  childViewOptions: function(model, index) {
    //
    //use different selectors for orgs
    var selector = (model.get('type') === 'org') ?
      '[data-org-name=' + model.get('name')  + ']' :
      '[data-state-change=' + model.get('type') + ']';

    var element = this.$el.find(selector);
    return !!element ? { el: element, index: index, model: model } : { index: index, model: model };
  },

  buildChildView: function(model, ViewClass, options) {

    //construct the default options
    var viewOptions = _.extend({}, options, { model: model });

    //construct specialist view for close button
    switch (model.get('type')) {
      case 'close':
        viewOptions = _.extend(viewOptions, { roomModel: this.model });
        return new CloseItemView(viewOptions);
      case 'favourite':
        viewOptions = _.extend(viewOptions, { dndCtrl: this.dndCtrl });
        return new FavouriteView(viewOptions);
      default:
        return new ViewClass(viewOptions);
    }

  },

  initialize: function(attrs) {
    this.shouldRender = false;
    this.bus          = attrs.bus;
    this.dndCtrl      = attrs.dndCtrl;
    this.model        = attrs.model;
    this.listenTo(this.collection, 'snapshot', this.onCollectionSnapshot, this);
    this.listenTo(this.model, 'change:state change:selectedOrgName', this.onMenuStateUpdate, this);
  },

  render: function() {
    return this.shouldRender ? Marionette.CollectionView.prototype.render.apply(this, arguments) : null;
  },

  onCollectionSnapshot: function() {
    //Only render after a snapshot
    this.shouldRender = true;
    RAF(function() {
      this.render();
    }.bind(this));
  },

  onItemClicked: function(view, model) { //jshint unused: true
    this.model.set({
      panelOpenState:       true,
      state:                model.get('type'),
      profileMenuOpenState: false,
      selectedOrgName:      model.get('name'),
    });
  },

  onMenuStateUpdate: function() {
    //reset the currently active model
    var activeModel = this.collection.findWhere({ active: true });
    if (activeModel) { activeModel.set('active', false); }

    //activate the new model
    var currentState = this.model.get('state');
    var nextActiveModel = (currentState !== 'org') ?
      this.collection.findWhere({ type: currentState }) :
      this.collection.findWhere({ name: this.model.get('selectedOrgName') });

    if (nextActiveModel) { nextActiveModel.set('active', true);}
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
      setTimeout(function() {
        this.model.set({ panelOpenState: newVal });
      }.bind(this), ANIMATION_TIME);
    }

  },

});

/*
var Backbone            = require('backbone');
var RoomMenuItemView    = require('./minibar-item-view');
var cocktail            = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');

require('nanoscroller');


var MiniBarView = Marionette.ItemView.extend({

  //TODO JP 28/1/16
  //Move keyboard events out into keyboard ctrl singleton
  keyboardEvents: {
     'room.1 room.2 room.3 room.4 room.5 room.6 room.7 room.8 room.9': 'onKeypressFocus',
  },

  initialize: function(attrs) {

    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of the MiniBarView');
    }

    this.bus = attrs.bus;

    if (!attrs || !attrs.dndCtrl)  {
      throw new Error('A valid drag & drop controller must be passed to a new instance of the MiniBarView');
    }

    this.dndCtrl = attrs.dndCtrl;

    this.roomMenuItems = [];
    this.roomMenuItemModels = new Backbone.Collection();

    //Feels icky to pull this out of the dom
    //but we have to because it's pre rendered
    //and not stored in the context
    //JP 28/1/16
    var _roomMenuItems = Array.prototype.slice.apply(this.$el.find('[data-state-change]'));
    _roomMenuItems.forEach(function(el, index) {

      var type = el.dataset.stateChange;

      var model = new Backbone.Model({ active: (index === 0), type: type });
      this.roomMenuItemModels.add(model);

      var view = new RoomMenuItemView({
        model:   model,
        el:      el,
        bus:     attrs.bus,
        dndCtrl: this.dndCtrl,
        menuModel: this.model,
      });
      this.roomMenuItems.push(view);

      this.listenTo(view, 'room-item-view:clicked', this.onItemClicked, this);

    }.bind(this));

    this.listenTo(this.model, 'change:panelOpenState', this.onPanelStateChange, this);
    this.listenTo(this.model, 'change', this.onMenuChange, this);

    this.$el.find('.nano').nanoScroller({
      iOSNativeScrolling: true,
      sliderMaxHeight:    200,
    });

  },

  //TODO this sequencing is not 100% decided upon
  //when it is the login needs to be tests
  //JP 12/1/16
  onItemClicked: function(type, orgName, isCloseButton) {
    if (isCloseButton) {
      var newVal = !this.model.get('roomMenuIsPinned');
      var ANIMATION_TIME = 300;

      //if we are opening the panel
      if (newVal === true) {
        if (this.model.get('panelOpenState') === true) {
          this.model.set({ roomMenuIsPinned: newVal });
          this.bus.trigger('room-menu:pin', newVal);
        } else {
          setTimeout(function() {
            this.model.set({ roomMenuIsPinned: newVal });
            this.bus.trigger('room-menu:pin', newVal);
          }.bind(this), ANIMATION_TIME);
        }

        this.model.set({ panelOpenState: newVal });
      } else {
        this.model.set({ roomMenuIsPinned: newVal });
        this.bus.trigger('room-menu:pin', newVal);
        setTimeout(function() {
          this.model.set({ panelOpenState: newVal });
        }.bind(this), ANIMATION_TIME);
      }
    }

    //If the pin button is clicked retain the current state
    if (type === 'pin') { type = this.model.get('state') }

    if (!orgName) { orgName = this.model.get('selectedOrgName') }

    this.model.set({
      panelOpenState:       true,
      state:                type,
      profileMenuOpenState: false,
      selectedOrgName:      orgName,
    });
  },

  onPanelStateChange: function(model, state) { //jshint unused: true
    this.$el.find('#menu-close-button').toggleClass('active', state);
    if (!state) {
      var currentActiveModel = this._getCurrentlyActiveChildModel();
      if (currentActiveModel) currentActiveModel.set('active', false);
    }
  },

  onMenuChange: function() {

    var orgName = this.model.get('selectedOrgName');
    var type    = this.model.get('state');

    if (!this.model.get('panelOpenState')) { return }

    //de-activate the old active item
    var currentActiveModel = this._getCurrentlyActiveChildModel();
    if (!!currentActiveModel) currentActiveModel.set('active', false);

    //activate the next item
    var query = (type === 'org') ? { orgName: orgName } : { type: type };
    var nextActiveModel = this.roomMenuItemModels.where(query)[0];
    if (!!nextActiveModel) nextActiveModel.set('active', true);

  },

  //TODO this feals too much like the above function, start extracting the functionality
  onKeypressFocus: function(e, handler) {//jshint unused: true
    var index = handler.key.split('+').slice(-1)[0];
    index     = parseInt(index, 10) - 1;
    var nextActiveModel = this.roomMenuItemModels.at(index);
    if (!nextActiveModel) { return }

    this.onItemClicked(nextActiveModel.get('type'), nextActiveModel.get('orgName'), false);
    this.bus.trigger('room-menu:keyboard:focus');
    this.bus.trigger('focus.request.out', e);
  },

  _getCurrentlyActiveChildModel: function() {
    return this.roomMenuItemModels.where({ active: true })[0];
  },

  onDestroy: function() {
    //unbind all child views
    this.roomMenuItems.forEach(function(v) {
      this.stopListening(v);
    }.bind(this));
    this.stopListening(this.model);
  },

});

cocktail.mixin(MiniBarView, KeyboardEventsMixin);

module.exports = MiniBarView;
*/
