'use strict';

var _                     = require('underscore');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var ItemView              = require('./secondary-collection-item-view');
var SearchItemView        = require('./secondary-collection-item-search-view');
var BaseCollectionView    = require('../base-collection/base-collection-view');
var EmptySearchView       = require('./secondary-collection-item-search-empty-view');

var proto = BaseCollectionView.prototype;

module.exports = BaseCollectionView.extend({
  childView: ItemView,
  className: 'secondary-collection',

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  buildChildView: function(model, ItemView, attrs) {
    switch (this.roomMenuModel.get('state')){
      case 'search':
        var opts = _.extend({}, attrs, { model: model });
        return (!!this.collection.length) ? new SearchItemView(opts) : new EmptySearchView(opts);
      default:
        return new ItemView(_.extend({}, attrs, { model: model }));
    }
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search'),
    });
  },

  emptyView: EmptySearchView,
  isEmpty: function() {
    return ((this.roomMenuModel.get('state') === 'search') && !this.collection.length);
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    this.primaryCollection = attrs.primaryCollection;
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
  },

  setActive: function() {
    switch (this.roomMenuModel.get('state')){
      case 'all':
        return (this.primaryCollection.length >= 10) ?
          this.$el.removeClass('active') :
          proto.setActive.apply(this, arguments);

      case 'search':
        return !!this.roomMenuModel.get('searchTerm') ?
          proto.setActive.apply(this, arguments) :
          this.$el.removeClass('active');

      default:
        return !!this.collection.length ?
          proto.setActive.apply(this, arguments) :
          this.$el.removeClass('active');
    }
  },

  filter: function(model, index) {//jshint unused: true
    switch (this.roomMenuModel.get('state')) {
      case 'search':
        return true;
      default:
        return (index <= 10);
    }
  },

  onItemClicked: function(view) {
    if (this.model.get('state') === 'search') {
      return this.model.set('searchTerm', view.model.get('name'));
    }

    //TODO this seems kinda sucky, is there a better way to do this?
    //JP 8/1/16
    PrimaryCollectionView.prototype.onItemClicked.apply(this, arguments);
  },

  onDestroy: function() {
    this.stopListening(this.model);
  },

});
