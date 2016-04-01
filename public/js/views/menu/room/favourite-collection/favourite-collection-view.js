'use strict';

var Backbone              = require('backbone');
var Marionette            = require('backbone.marionette');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var BaseCollectionView    = require('../base-collection/base-collection-view');
var ItemView              = require('./favourite-collection-item-view');
var toggleClass           = require('utils/toggle-class');

var FavouriteCollection = PrimaryCollectionView.extend({

  childView: ItemView,

  events: {
    'mouseenter': 'onMouseEnter',
    'mouseleave': 'onMouseLeave'
  },

  initialize: function() {
    PrimaryCollectionView.prototype.initialize.apply(this, arguments);
    this.uiModel = new Backbone.Model({ isDragging: false });
    this.listenTo(this.uiModel, 'change:isDragging', this.onDragStateUpdate, this);
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag room-menu:add-favourite room-menu:sort-favourite', this.onDragEnd, this);
  },

  getChildContainerToBeIndexed: function () {
    //For the favourite collection we use the first child because there
    //is no search header unlike the primary collection
    return this.el.children[0];
  },

  //JP 29/3/16
  //The primary collection has some show/hide logic around it's search header
  //in the favourite collection we don't have that piece of UI so we override and delegate
  //down to the base class. Not ideal but I don't want to introduce another layer of inheritance
  //between this and the primary collection at this point.
  //If the complexity around this rises I may consider it
  setActive: function () {
    BaseCollectionView.prototype.setActive.apply(this, arguments);
  },

  getEmptyView: function() {
    switch (this.roomMenuModel.get('state')) {
      default:
        return Marionette.ItemView.extend({ template: false });
    }
  },

  onDragStart: function () {
    this.uiModel.set('isDragging', true);
    this.el.classList.add('dragging');
  },

  onDragEnd: function () {
    this.uiModel.set('isDragging', false);
    this.el.classList.remove('dragging');
  },

  onDragStateUpdate: function (model, val) { //jshint unused: true
    toggleClass(this.el, 'dragging', val);
  },

  onMouseEnter: function (){
    if(!this.uiModel.get('isDragging')) { return; }
    document.body.classList.add('drag-over-favourite');
  },

  onMouseLeave: function (){
    if(!this.uiModel.get('isDragging')) { return; }
    document.body.classList.remove('drag-over-favourite');
  },

});

module.exports =  FavouriteCollection;
