'use strict';

var Marionette  = require('backbone.marionette');
var fastdom     = require('fastdom');
var template    = require('./base-collection-view.hbs');
var context     = require('utils/context');
var toggleClass = require('utils/toggle-class');

module.exports = Marionette.CompositeView.extend({

  template:           template,
  className:          'collection',
  childViewContainer: '#collection-list',

  childViewOptions: function(model) {
    var index = this.collection.indexOf(model);
    return {
      model:     model,
      index:     index,
      menuState: this.roomMenuModel.get('state'),
      roomMenuModel: this.roomMenuModel,
    };
  },

  modelEvents: {
    'change:header': 'render',
  },

  collectionEvents: {
    'change:mentions change:unreadMessages change:lastAccessTime add remove': 'render',
    'add remove reset': 'onFilterComplete',
  },

  childEvents: {
    'item:clicked':   'onItemClicked',
    'hide:complete':  'onHideLeaveRoom',
    'leave:complete': 'onHideLeaveRoom',
  },

  constructor: function(attrs) {
    this.bus           = attrs.bus;
    this.collection    = attrs.collection;
    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:state:post change:selectedOrgName', this.render, this);
    Marionette.CompositeView.prototype.constructor.apply(this, arguments);
  },

  initialize: function() {
    if (this.model.get('active')) {
      this.render();
    }
  },

  onItemClicked: function(view) {
    var model = view.model;
    var name = (model.get('uri') || model.get('url') || model.get('name') || model.get('fromUser').username);
    var url  = (name[0] !== '/') ?  '/' + name : name;

    //We have to explicitly check for false because search
    //results come through with `exists: false` for rooms yet to be created
    //whereas on room models `exists: undefined` :( JP 10/3/16
    if (model.get('exists') === false) {
      return this._openCreateRoomDialog(name);
    }

    //default trigger navigation to an existing room
    this._triggerNavigation(url, 'chat', name);
  },

  onFilterComplete: function() {
    this.setActive();
  },

  onBeforeRender: function() {
    this.setLoaded(false);
  },

  onRender: function() {
    fastdom.mutate(function() {
      this.setActive();
      this.setLoaded();
    }.bind(this));
  },

  setActive: function () {
    toggleClass(this.el, 'active', this.model.get('active'));
  },

  setLoaded: function (val) {
    val = (val || true);
    toggleClass(this.el, 'loaded', val);
  },

  onHideLeaveRoom: function (view) {
    //If we are hiding the current room, navigate to /home JP 11/3/16
    if (this._isCurrentRoom(view.model)) { this._navigateToHome(); }
  },

  onDestroy: function() {
    this.stopListening(context.troupe());
  },

  _triggerNavigation: function (url, type, name) {
    this.bus.trigger('navigation', url, type, name);
  },

  _navigateToHome: function () {
    this._triggerNavigation('/home', 'home', 'Home');
  },

  _isCurrentRoom: function (model) {
    return (context.troupe().get('id') === model.get('id'));
  },

  _openCreateRoomDialog: function(name) {
    window.location.hash = '#confirm/' + name;
  },

});
