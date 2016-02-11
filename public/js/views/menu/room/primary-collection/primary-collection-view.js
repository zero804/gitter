'use strict';

var Backbone           = require('backbone');
var _                  = require('underscore');
var ItemView           = require('./primary-collection-item-view');
var BaseCollectionView = require('../base-collection/base-collection-view');
var EmptySearchView    = require('./primary-collection-item-search-empty-view.js');

var proto = BaseCollectionView.prototype;

var PrimaryCollectionView = BaseCollectionView.extend({

  childView: ItemView,
  className: 'primary-collection',
  ui: {
    collection: '.js-collection-list',
  },

  emptyView: EmptySearchView,
  isEmpty: function() {
    return ((this.roomMenuModel.get('state') === 'search') && !this.collection.length);
  },

  buildChildView: function(model, ItemView, attrs) {
    switch (this.roomMenuModel.get('state')){
      case 'search':
        var opts = _.extend({}, attrs, { model: model });
        return (!!this.collection.length) ? new ItemView(opts) : new EmptySearchView(opts);
      default:
        return new ItemView(_.extend({}, attrs, { model: model }));
    }
  },

  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;
    this.uiModel = new Backbone.Model({ isFocused: false });

    //TODO turn this into an error if there is a dndCtrl
    this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavouriteAdded, this);
    this.listenTo(this.dndCtrl, 'room-menu:sort-favourite', this.onFavouritesSorted, this);
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
  },

  setActive: function() {
    switch (this.roomMenuModel.get('state')){
      case 'search':
        this.$el.toggleClass('active', !!this.roomMenuModel.get('searchTerm'));
        break;
      default:
        proto.setActive.apply(this, arguments);
        break;

    }
  },

  filter: function(model, index) { //jshint unused: true
    return (this.model.get('search') === 'search') ? (index <= 5) : true;
  },

  //TODO The filter should be reused within the view filter method?
  onFavouriteAdded: function(id) {
    var newFavModel = this.collection.get(id);
    var favIndex    = this.collection
      .filter(function(model) { return !!model.get('favourite'); }).length;
    newFavModel.set('favourite', (favIndex + 1));
    newFavModel.save();
  },

  onFavouritesSorted: function(targetID, siblingID) {

    var target       = this.collection.get(targetID);
    var sibling      = this.collection.get(siblingID);
    var index = !!sibling ? sibling.get('favourite') : (this.getHighestFavourite() + 1);

    //Save the new favourite
    target.set('favourite', index);
    target.save();
    this.collection.sort();
  },

  //TODO TEST THIS YOU FOOL JP 10/2/16
  getHighestFavourite: function() {
    return this.collection.pluck('favourite')
    .filter(function(num) { return !!num; })
    .sort(function(a, b) { return a < b ? -1 : 1; })
    .slice(-1)[0];
  },

  //Before we render we remove the collection container from the drag & drop instance
  onBeforeRender: function() {
    this.dndCtrl.removeContainer(this.ui.collection[0]);
  },

  onDestroy: function() {
    this.stopListening(this.bus);
    this.stopListening(this.model);
    this.stopListening(this.dndCtrl);
    this.stopListening(this.collection);
  },

});

module.exports = PrimaryCollectionView;
