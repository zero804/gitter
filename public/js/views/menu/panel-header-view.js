'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./tmpl/panel-header-view.hbs');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'render',
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

});
