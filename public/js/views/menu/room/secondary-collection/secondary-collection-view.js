'use strict';

var _                     = require('underscore');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var ItemView              = require('./secondary-collection-item-view');
var SearchItemView        = require('./secondary-collection-item-search-view');
var BaseCollectionView    = require('../base-collection/base-collection-view');
var EmptySearchView       = require('./secondary-collection-item-search-empty-view');

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
  isEmpty: function (){
    return ((this.roomMenuModel.get('state') === 'search') && !this.collection.length);
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    this.primaryCollection = attrs.primaryCollection;
    this.listenTo(this.model, 'change:searchTerm', this.onSearchTermChange, this);
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

  onSearchTermChange: function(model, val) { //jshint unused: true
    if (model.get('state') !== 'search') { return; }

    this.$el.toggleClass('active', !val);
  },

  onDestroy: function() {
    this.stopListening(this.model);
  },

  onRender: function(){
    this.$el.addClass('loaded');
    if(this.roomMenuModel.get('state') === 'search') {
      console.log('removing');
      this.$el.removeClass('empty');
    }
  },

  render: function() {
    BaseCollectionView.prototype.render.apply(this, arguments);
  },

});
