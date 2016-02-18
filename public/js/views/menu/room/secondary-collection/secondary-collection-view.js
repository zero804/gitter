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
    'item:clicked':      'onItemClicked',
    'user:item:clicked': 'onUserLinkClicked',
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
    this.userModel         = attrs.userModel;
    this.troupeModel       = attrs.troupeModel;
    this.roomCollection    = attrs.roomCollection;
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

  onUserLinkClicked: function(view) {
    var model = view.model.get('fromUser');
    var user = this.userModel;
    if (model.id === user.get('id')) { return; }

    proto.onItemClicked.apply(this, arguments);
  },

});
