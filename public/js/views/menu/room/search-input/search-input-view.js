//TODO TEST THIS JP 10/2/16
'use strict';

var Marionette = require('backbone.marionette');
var _          = require('underscore');
var template   = require('./search-input-view.hbs');

module.exports = Marionette.ItemView.extend({

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

  initialize: function() {
    this.onModelChangeState();
  },

  onInputChange: _.debounce(function(e) {
    e.preventDefault();
    var val = e.target.value.trim();

    //This is here and not in a model change event because of the debounce
    //Obviously the styles need to change more quickly to give a responsive feel to thr ui
    //JP 10/2/16
    this.el.classList.toggle('empty', !val);
    this.model.set('searchTerm', val);
  }, 100),

  onModelChangeState: function (model, val){ //jshint unused: true
    this.el.classList.toggle('active', (val === 'search'));
    if(val === 'search') { this.ui.input.focus(); }
  },

  onModelChangeSearchTerm: function(model, val) { //jshint unused: true
    this.ui.input.val(val);
    this.el.classList.toggle('empty', !val);
    this.ui.input.focus();
  },

  onClearClicked: function(e) {
    e.preventDefault();
    this.model.set('searchTerm', '');
    this.ui.input.focus();
  },

});
