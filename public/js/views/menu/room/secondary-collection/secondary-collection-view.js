'use strict';

var Marionette         = require('backbone.marionette');
var _                  = require('underscore');
var ItemView           = require('./secondary-collection-item-view');
var SearchItemView     = require('./secondary-collection-item-search-view');
var BaseCollectionView = require('../base-collection/base-collection-view');
var EmptySearchView    = require('./secondary-collection-item-search-empty-view');

var proto = BaseCollectionView.prototype;

module.exports = BaseCollectionView.extend({
  childView: ItemView,
  className: 'secondary-collection',

  childEvents: {
    'item:clicked':      'onItemClicked',
  },

  getEmptyView: function(){
    switch(this.roomMenuModel.get('state')) {
      case 'search':
        return EmptySearchView;
      default:
        return Marionette.ItemView.extend({ template: false });
    }
  },

  buildChildView: function(model, ItemView, attrs) {
    var opts = _.extend({}, attrs, { model: model });

    //Only render  search result view if we are in the search state with search results
    if(this.roomMenuModel.get('state') === 'search' && !!this.collection.length) {
      return new SearchItemView(opts);
    }

    return new ItemView(opts);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search'),
    });
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    this.primaryCollection = attrs.primaryCollection;
    this.userModel         = attrs.userModel;
    this.troupeModel       = attrs.troupeModel;
    this.roomCollection    = attrs.roomCollection;
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
    BaseCollectionView.prototype.initialize.apply(this, arguments);
  },

  setActive: function() {
    var shouldDisableCollection = false;

    switch (this.roomMenuModel.get('state')){
      case 'all':
        shouldDisableCollection = this.primaryCollection.length >= 10 || this.collection.length <= 0;
        break;

      case 'search':
        shouldDisableCollection = !this.roomMenuModel.get('searchTerm');
        break;

      default:
        shouldDisableCollection = !this.collection.length;
        break;
    }

    if(shouldDisableCollection) {
      this.model.set('active', false);
    }
    proto.setActive.apply(this, arguments);

    return shouldDisableCollection;
  },

  filter: function(model, index) {
    switch (this.roomMenuModel.get('state')) {
      case 'search':
        return (index <= 25);
      default:
        return !this.primaryCollection.get(model.get('id'));
    }
  },

  onDestroy: function() {
    this.stopListening(this.model);
  },

  onItemClicked: function(view) {
    return (this.roomMenuModel.get('state') === 'search') ?
      this.redirectToPermalink(view) :
      proto.onItemClicked.apply(this, arguments);
  },

  //TODO this assumes the room you are viewing is in the room collection
  //if not we should perform a API request to get the details JP 12/2/16
  redirectToPermalink: function(view) {
    var roomId = this.troupeModel.get('id');
    var room   = this.roomCollection.findWhere({ id: roomId });

    //TODO FIX THIS
    if (!room) { throw new Error('ROOM NOT IN ROOM LIST AGHHHHHHHHH .....'); }

    //Format URL
    var url  = room.get('uri');
    if (url[0] !== '/') { url = '/' + url }
    url      = url + '?at=' + view.model.get('id');

    var name = room.get('name');
    this._triggerNavigation(url, 'chat', name);
  },


});
