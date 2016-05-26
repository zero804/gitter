'use strict';

//TODO This is too specialised, abstract jp 2/2/16

var Backbone = require('backbone');
var _ = require('underscore');
var BaseResolverCollection = require('./base-resolver-collection.js');
var context = require('utils/context');

var ContextModel = Backbone.Model.extend({
  defaults: {
    active: false,
    roomId: null,
    searchTerm: null,
  },
  initialize: function(attrs, options) { //jshint unused: true
    this.roomMenuModel = options.roomMenuModel;
    this.roomModel = options.roomModel;
    this.listenTo(this.roomMenuModel, 'change:searchTerm change:state', this.onModelUpdate, this);
    this.listenTo(this.roomModel, 'change:id', this.onModelUpdate, this);

    this.set('active', this.roomMenuModel.get('state') === 'search');
    this.set('roomId', context.troupe().id);
  },

  onModelUpdate: function() {
    if (this.roomMenuModel.get('state') !== 'search') { return this.set('active', false); }

    if (!this.roomMenuModel.get('searchTerm')) { return this.set('active', false); }

    if (!this.roomModel.get('id')) { return this.set('active', false); }
    this.set({
      roomId:     this.roomModel.get('id'),
      searchTerm: this.roomMenuModel.get('searchTerm'),
    });

    //This has to be separate to avoid a race condition in the urlMNodel
    //this will resolve the template first and setting active will cause the collection to fetch
    //AFTER the url is resolvable JP 2/2/16
    this.set('active', true);
  },
});

module.exports = BaseResolverCollection.extend({
  //TODO how do we set lang?
  template: '/v1/rooms/:roomId/chatMessages',

  initialize: function(models, attrs) {//jshint unused: true

    if (!attrs || !attrs.roomMenuModel) {
      throw new Error('A valid instance of RoomMenuModel must be passed to a new instance of SearchChatMessages');
    }

    this.roomMenuModel = attrs.roomMenuModel;

    if (!attrs || !attrs.roomModel) {
      throw new Error('A valid instance of a roomModel must be passed to a new Instance of SearchChatMessages');
    }

    this.roomModel = attrs.roomModel;

    this.contextModel = new ContextModel(null, { roomMenuModel: this.roomMenuModel, roomModel: this.roomModel });

    this.listenTo(this.contextModel, 'change:active', this.onModelUpdateActive, this);
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearchTermUpdate, this);

    BaseResolverCollection.prototype.initialize.apply(this, arguments);
  },

  onModelUpdateActive: function(model, val) { //jshint unused: true
    return (!val) ? this.reset() : this.fetchResults();
  },

  onSearchTermUpdate: function (model, val){ //jshint unused: true
    if(!this.contextModel.get('active')) { return }
    if(!val) { return this.reset(); }
    this.fetchResults();
  },

  fetchResults: _.debounce(function (){
    this.fetch({
      data: {
        q:     this.roomMenuModel.get('searchTerm'),
        lang:  context.lang(),
        limit: 45
      }
    });
  }, 50),

});
