'use strict';

var Marionette = require('backbone.marionette');
var template = require('./search-input-view.hbs');

module.exports = Marionette.ItemView.extend({
  template: template,

  modelEvents: {
    'change:state': 'onModelChangeState'
  },

  events: {
    'input': 'onInputChange',
  },

  onModelChangeState: function(model, val) { /*jshint unused: true */
    this.$el.toggleClass('active', (val === 'search'));
    if (val === 'search') { this.$el.focus(); }
  },

  onInputChange: function(e) {
    e.preventDefault();
    this.model.set('searchTerm', e.target.value);
  }

});
