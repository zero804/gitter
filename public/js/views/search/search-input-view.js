"use strict";

var Marionette = require('marionette');
var template = require('./tmpl/search-input.hbs');

var SearchInputView = Marionette.ItemView.extend({
  template: template,

  ui: {
    input: '.js-search-input',
    clearIcon: '.js-search-clear-icon',
    searchIcon: '.js-search-icon'
  },

  events: {
    'click .js-activate-search': 'activate',
    'click @ui.clearIcon' : 'clearSearchTerm',
    'click @ui.input': 'activate',
    'blur @ui.input': 'onBlur',
    'change @ui.input': 'handleChange',
    'input @ui.input': 'handleChange'
  },

  modelEvents: {
    'change:isLoading': 'onResultsLoading',
    'change:active': 'onActiveChange'
  },

  activate: function() {
    this.model.set('active', true);
  },

  onBlur: function() {
    if (!this.ui.input.val()) {
      this.model.set('active', false);
    }
  },

  clearSearchTerm: function () {
    this.model.set('searchTerm', '');
    this.ui.input.val('');
    this.ui.input.focus();
  },

  handleChange: function(e) {
    this.model.set('searchTerm', e.target.value.trim());
  },

  onResultsLoading: function(model, isLoading) {
    this.ui.searchIcon.toggleClass('fetching', isLoading);
  },

  onActiveChange: function(model, isActive) {
    this.$el.toggleClass('active', isActive);

    var $input = this.ui.input;

    if (isActive) {
      if (!$input.is(':focus')) $input.focus();
    } else {
      $input.val('');
    }
  }
});

module.exports = SearchInputView;
