'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({

  defaults: {
    header: false,
    active: false,
  },

  constructor: function(attrs, options) {
    if (!options || !options.roomMenuModel) {
      throw new Error('A valid instance of roomMenuModel must be passed to a new instance of BaseCollectionModel');
    }

    this.roomMenuModel = options.roomMenuModel;
    this.listenTo(options.roomMenuModel, 'change:state change:searchTerm', this.determineActiveState, this);
    this.listenTo(options.collection, 'sync reset', this.determineActiveState, this);
    Backbone.Model.prototype.constructor.apply(this, arguments);

    this.determineActiveState(this.roomMenuModel, this.roomMenuModel.get('state'));
  },

  determineActiveState: function(model) {
    var state = this.roomMenuModel.get('state');
    this.set('state', state);
    switch (state) {
      case 'all':
        this.onAll();
        break;
      case 'search':
        this.onSearch();
        break;
      case 'people':
        this.onPeople();
        break;
      case 'org':
        this.onOrg();
        break;
      default:
        this.onDefault();
        break;
    }
  },

  onAll:       function() { this.onDefault(); },
  onSearch:    function() { this.onDefault(); },
  onPeople:    function() { this.onDefault(); },
  onOrg:       function() { this.onDefault(); },
  onDefault:   function() {},

});
