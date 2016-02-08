'use strict';

var Marionette = require('backbone.marionette');
var _          = require('underscore');
var template   = require('./search-input-view.hbs');

var SearchInputView = Marionette.ItemView.extend({

  template: template,
  className: 'search-input-container',

  ui: {
    input: '.js-search-input',
    clearIcon: '.js-search-clear-icon',
    searchIcon: '.js-search-icon',
  },

  events: {
    //'click .js-activate-search': 'activate',
    'click @ui.clearIcon': 'clearSearchTerm',
    'click @ui.input': 'activate',

    //'blur @ui.input': 'onBlur',
    'change @ui.input': 'handleChange',
    'input @ui.input': 'handleChange',
  },

  modelEvents: {
    //'change:isLoading': 'onResultsLoading',
    //'change:active': 'onActiveChange'
    'change:state': 'onModelStateChange',
    'change:searchTerm': 'onModelSearchTermChange',
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/
    this.$el.toggleClass('active', (val === 'search'));
    if (val === 'search') {
      this.ui.input.focus();
    }
  },

  activate: function() {
    this.model.set('active', true);
  },

  onBlur: function() {
    if (!this.ui.input.val()) {
      this.model.set('active', false);
    }
  },

  clearSearchTerm: function() {
    this.model.set('searchTerm', '');
    this.ui.input.val('');
    this.ui.input.focus();
  },

  handleChange: _.debounce(function(e) {
    var val = e.target.value.trim();
    this.model.set('searchTerm', val);
  }, 300),

  onResultsLoading: function(model, isLoading) { // jshint unused:true
    this.ui.searchIcon.toggleClass('fetching', isLoading);
  },

  onActiveChange: function(model, isActive) { // jshint unused:true
    this.$el.toggleClass('active', isActive);

    var $input = this.ui.input;

    if (isActive && !$input.is(':focus')) {
      $input.focus();
    } else {
      $input.val('');
    }
  },

  onModelSearchTermChange: function(model, val) {//jshint unused: true
    this.ui.input.val(val);
  },
});

module.exports = SearchInputView;
