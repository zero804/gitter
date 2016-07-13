'use strict';

var Marionette = require('backbone.marionette');
var fastdom = require('fastdom');
var template = require('./base-collection-view.hbs');
var context = require('utils/context');
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

  childEvents: {
    'item:activated': 'onItemActivated',
    'hide:complete':  'onHideLeaveRoom',
    'leave:complete': 'onHideLeaveRoom',
  },

  ui: {
    header:        '#collection-header',
    headerContent: '#collection-header-text',
    dismissButton: '#dismiss-suggestion',
    showMore:      '#room-item-show-more',
  },

  events: {
    'click @ui.header':  'onHeaderClicked',
  },

  modelEvents: {
    'change:header': 'onHeaderChange',
    'change:active': 'setActive'
  },

  collectionEvents: {
    'add remove reset': 'onFilterComplete',
  },


  constructor: function(attrs) {
    this.bus = attrs.bus;
    this.collection = attrs.collection;
    this.roomMenuModel = attrs.roomMenuModel;
    this.roomCollection = attrs.roomCollection;
    this.listenTo(this.roomMenuModel, 'change:hasDismissedSuggestions', this.onDismissSuggestionsUpdate, this);
    this.listenTo(this.roomMenuModel, 'change:state', this.clearFocus, this);
    this.listenTo(context.troupe(), 'change:id', this.onRoomUpdate, this);
    Marionette.CompositeView.prototype.constructor.apply(this, arguments);
  },

  initialize: function() {
    var activeModel = this.collection.get(context.troupe().get('id'));
    if(!activeModel) { return; }
    //On init we set focus on the active element because we can reliably assume that a minibar item is visible
    //which we can't for room-itmes as you can load the menu in an org state
    activeModel.set({ active: true, focus: true });
  },

  onItemActivated: function(view) {
    var model = view.model;
    var url = view.getRoomUrl();
    var name = view.getRoomName();

    //We have to explicitly check for false because search
    //results come through with `exists: false` for rooms yet to be created
    //whereas on room models `exists: undefined` :( JP 10/3/16
    // org-items have `room`, not exists
    if (model.get('room') || model.get('exists') !== false) {
      //default trigger navigation to an existing room
      this._triggerNavigation(url, 'chat', name);
      return;
    }

    return this._openCreateRoomDialog(name);
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

  onHeaderClicked: function (){
    this.roomMenuModel.set('hasDismissedSuggestions', !this.roomMenuModel.get('hasDismissedSuggestions'));
  },

  onDismissSuggestionsUpdate: function (model, val){ //jshint unused: true
    //Only opperate if we are displaying suggestions
    if(!this.model.get('isSuggestion')) { return; }
    //If the suggestions have been dismissed hide the collection
    if(val) { this.el.classList.remove('active'); }
  },

  //We avoid re-rendering AT ALL TIMES so now we have to manually change content
  onHeaderChange: function (model, val){ //jshint unused: true

    this.ui.headerContent.html(val);

    //If this is a suggestion show the cancel button
    if(this.model.get('isSuggestion')) {
      return this.ui.dismissButton[0].classList.remove('hidden');
    }
    return this.ui.dismissButton[0].classList.add('hidden');
  },

  clearFocus: function (){
    var elementsInFocus = this.collection.where({ focus: true });
    elementsInFocus.forEach(function(model){
      model.set('focus', false);
    });
  },

  clearActive: function (){
    var activeElements = this.collection.where({ active: true });
    activeElements.forEach(function(model){
      model.set('active', false);
    });
  },

  focusActiveElement: function (){
    var activeElement = this.collection.findWhere({ active: true });
    if(!activeElement) { return; }
    activeElement.set('focus', true);
  },

  onRoomUpdate: function (troupe, id){
    this.clearFocus();
    this.clearActive();
    var model = this.collection.get(id);
    if(!model) { return; }
    model.set({ active: true, focus: true });
  },

  _triggerNavigation: function (url, type, name) {
    this.clearFocus();
    this.bus.trigger('navigation', url, type, name);
    this.focusActiveElement();
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
