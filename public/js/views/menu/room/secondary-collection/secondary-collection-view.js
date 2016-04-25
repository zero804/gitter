'use strict';

var Marionette         = require('backbone.marionette');
var _                  = require('underscore');
var urlJoin            = require('url-join');
var ItemView           = require('./secondary-collection-item-view');
var SearchItemView     = require('./secondary-collection-item-search-view');
var BaseCollectionView = require('../base-collection/base-collection-view');
var EmptySearchView    = require('./secondary-collection-item-search-empty-view');

var clientEnv = require('gitter-client-env');

var proto = BaseCollectionView.prototype;

module.exports = BaseCollectionView.extend({
  childView: ItemView,
  className: 'secondary-collection',

  childEvents: {
    'item:activated': 'onItemActivated',
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
    BaseCollectionView.prototype.initialize.apply(this, arguments);
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

  onItemActivated: function(view) {
    return (this.roomMenuModel.get('state') === 'search') ?
      this.redirectToPermalink(view) :
      proto.onItemActivated.apply(this, arguments);
  },

  redirectToPermalink: function(view) {
    var roomUri = this.troupeModel.get('uri');
    var permalink = urlJoin(clientEnv.basePath, roomUri, '?at=' + view.model.get('id'));

    var name = this.troupeModel.name;
    this._triggerNavigation(permalink, 'chat', name);
  },


});
