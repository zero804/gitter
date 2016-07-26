'use strict';

var Marionette = require('backbone.marionette');
var _ = require('underscore');
var urlJoin = require('url-join');
var extendCallbackHash = require('utils/marionette-extend-callback-hash');
var ItemView = require('./secondary-collection-item-view');
var SearchItemView = require('./secondary-collection-item-search-view');
var BaseCollectionView = require('../base-collection/base-collection-view');
var EmptySearchView = require('./secondary-collection-item-search-empty-view');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');

var clientEnv = require('gitter-client-env');


var proto = BaseCollectionView.prototype;

module.exports = BaseCollectionView.extend({
  childView: ItemView,
  className: 'secondary-collection',

  childEvents: extendCallbackHash(proto.childEvents, {
    'item:activated': 'onItemActivated',
  }),

  modelEvents: extendCallbackHash(proto.modelEvents, {
    'change:active': 'toggleShowMore'
  }),

  getEmptyView: function() {
    switch (this.roomMenuModel.get('state')) {
      case 'search':
        return EmptySearchView;
      default:
        return Marionette.ItemView.extend({ template: false });
    }
  },

  buildChildView: function(model, ItemView, attrs) {
    var opts = _.extend({}, attrs, { model: model });

    //Only render  search result view if we are in the search state with search results
    if (this.roomMenuModel.get('state') === 'search' && !!this.collection.length) {
      return new SearchItemView(opts);
    }

    return new ItemView(opts);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, proto.serializeData.apply(this, arguments), data, {
      isSearch:        (data.state === 'search'),
      orgRoomUrl:      this.getOrgRoomUrl(),
    });
  },

  getOrgRoomUrl: function () {
    var groupId = this.roomMenuModel.get('groupId');
    var selectedGroup = this.groupsCollection.get(groupId);
    var uri = getOrgNameFromUri(document.location.pathname);
    if(selectedGroup) {
      uri = selectedGroup.get('uri');
    }
    return urlJoin('/orgs', uri, 'rooms');
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    BaseCollectionView.prototype.initialize.apply(this, arguments);

    this.primaryCollection = attrs.primaryCollection;
    this.userModel = attrs.userModel;
    this.troupeModel = attrs.troupeModel;
    this.roomCollection = attrs.roomCollection;

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
    this.listenTo(this.roomMenuModel, 'change:state:post', this.toggleShowMore, this);
    this.listenTo(this.collection, 'reset', this.toggleShowMore, this);
  },

  toggleShowMore: function () {
    //Sort out show more button
    if (this.roomMenuModel.get('state') === 'org' && this.collection.length >= 9) {
      this.ui.showMore.attr('href', this.getOrgRoomUrl());
      var groupId = this.roomMenuModel.get('groupId');
      var selectedGroup = this.groupsCollection.get(groupId);
      this.ui.showMore.attr('title', 'more ' + !!selectedGroup ? selectedGroup.get('name') : '' + ' rooms');
      this.ui.showMore[0].classList.remove('hidden');
    } else {
      this.ui.showMore[0].classList.add('hidden');
    }
  },

  filter: function(model, index) {
    var isHidden = false;

    switch (this.roomMenuModel.get('state')) {
      case 'org':
        isHidden = (index > 9);
        break;
      default:
        isHidden = !!this.primaryCollection.get(model.get('id'));
        break;
    }

    model.set({ isHidden: isHidden });
    return !isHidden;
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
    var roomId = this.troupeModel.get('id');
    var model = this.roomCollection.get(roomId);
    var roomUri = model.get('uri') || model.get('url');
    var permalink = urlJoin(clientEnv.basePath, roomUri, '?at=' + view.model.get('id'));

    var name = this.troupeModel.name;
    this._triggerNavigation(permalink, 'chat', name);
  },

});
