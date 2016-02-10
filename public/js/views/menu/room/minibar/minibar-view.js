'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var ItemView      = require('./minibar-item-view');
var CloseItemView = require('./minibar-close-item-view');
var FavouriteView = require('./minibar-favourite-item-view');
var PeopleView    = require('./minibar-people-item-view.js');
var RAF           = require('utils/raf');


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
    return !!element.length ? { el: element, index: index, model: model } : { index: index, model: model };
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

    this.shouldRender   = false;

    this.listenTo(this.roomCollection, 'add remove', this.render, this);
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

  onDestroy: function (){
    this.stopListening(this.collection);
    this.stopListening(this.model);
    this.stopListening(this.roomCollection);
  },

});
