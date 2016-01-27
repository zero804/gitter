'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  //TODO Make sure all objects are passed to all menu models as options not attrs.
  //JP 27/1/16
  constructor: function(attrs, options) {//jshint unused: true

    if (!options || !options.model) {
      throw new Error('A valid instance of the roomMenuModel should be passed to a new instance of SecondaryCollectionModel');
    }

    this.model = options.model;
    this.listenTo(this.model, 'change:state', this.onModelChangeState, this);
    Backbone.Model.prototype.constructor.apply(this, arguments);
  },

  onModelChangeState: function() {
    switch (this.model.get('state')) {
      case 'search' :
        this.set({
          secondaryCollectionHeader: 'Recent Searches',
          secondaryCollectionActive: true,
        });
        break;
      case 'org':
        this.set({
          secondaryCollectionHeader: 'All Rooms',
          secondaryCollectionActive: true,
        });
        break;
      case 'all':
        this.set({
          secondaryCollectionHeader: 'Your Suggestions',
          secondaryCollectionActive: true,
        });
        break;
      default:
        this.set({
          secondaryCollectionHeader: '',
          secondaryCollectionActive: false,
        });

    }
  },

});
