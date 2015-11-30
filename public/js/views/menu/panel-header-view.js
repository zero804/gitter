'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./tmpl/panel-header-view.hbs');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'render',
  },

  events: {
    'click': 'onClick',
  },

  serializeData: function() {
    var state = this.model.get('state');
    return {
      isAllState: (state === 'all'),
      isSearchState: (state === 'search'),
      isFavouriteState: (state === 'favourite'),
      isPeopleState: (state === 'people')
    };
  },

  onClick: function (){
    this.model.set('profileMenuOpenState', !this.model.get('profileMenuOpenState'));
  },

});
