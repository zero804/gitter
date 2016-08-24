//TODO TEST THIS JP 10/2/16
'use strict';

var Marionette = require('backbone.marionette');
var _ = require('underscore');
var cocktail = require('backbone.cocktail');
var KeyboardEventMixin = require('views/keyboard-events-mixin');
var template = require('./search-input-view.hbs');
var toggleClass = require('utils/toggle-class');
var RAF = require('utils/raf');

var SearchInputView = Marionette.ItemView.extend({

  template: template,
  className: 'left-menu-search empty',

  ui: {
    clear: '.js-search-clear',
    input: 'input',
  },

  events: {
    'change':          'onInputChange',
    'input':           'onInputChange',
    'click @ui.clear': 'onClearClicked',
  },

  modelEvents: {
    'change:state':      'onModelChangeState',
    'change:searchTerm': 'onModelChangeSearchTerm',
  },

  keyboardEvents: {
    'room-list.start-nav': 'focusSearchInput',
  },

  initialize: function(attrs) {
    this.bus = attrs.bus;
    this.focusModel = attrs.searchFocusModel;
    this.listenTo(this.bus, 'left-menu:recent-search', this.onRecentSearchUpdate, this);
    this.listenTo(this.focusModel, 'change:focus', this.onFocusUpdate, this);
  },

  onInputChange: _.debounce(function(e) {
    e.preventDefault();
    var val = e.target.value.trim();

    //This is here and not in a model change event because of the debounce
    //Obviously the styles need to change more quickly to give a responsive feel to thr ui
    //JP 10/2/16
    toggleClass(this.el, 'empty', !val);
    this.model.set('searchTerm', val);
  }, 500),

  onModelChangeState: function (model, val){ //jshint unused: true
    toggleClass(this.el, 'active', val === 'search');
  },

  onRender: function (){
    this.onModelChangeState(this.model, this.model.get('state'));
    setTimeout(function(){
      this.onFocusUpdate(this.focusModel, this.focusModel.get('focus'));
    }.bind(this), 1000);
  },

  onModelChangeSearchTerm: function(model, val) { //jshint unused: true
    if(val === '') { this.ui.input.val(val); }
    toggleClass(this.el, 'empty', !val);
  },

  onClearClicked: function(e) {
    e.preventDefault();
    this.model.set('searchTerm', '');
  },

  onRecentSearchUpdate: function (val){
    this.ui.input.val(val);
  },

  onFocusUpdate: function (model, val){
    RAF(function(){
      if(val) { return this.ui.input.focus();}
      this.ui.input.blur();
    }.bind(this));
  },

});

cocktail.mixin(SearchInputView, KeyboardEventMixin);


module.exports = SearchInputView;
