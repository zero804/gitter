'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Model.extend({

  defaults: {
    header: false,
    active: false,
  },

  constructor: function(attrs, options) { //jshint unused: true
    if (!options || !options.roomMenuModel) {
      throw new Error('A valid instance of roomMenuModel must be passed to a new instance of BaseCollectionModel');
    }

    this.roomMenuModel = options.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:state', this.onModelChangeState, this);
    this.listenTo(this.roomMenuModel, 'update:collection-active-states', this.updateModelActiveState, this);
    Backbone.Model.prototype.constructor.apply(this, arguments);

    this.updateModelActiveState();
    this.onModelChangeState(this.roomMenuModel, this.roomMenuModel.get('state'));
  },

  updateModelActiveState: function() {

  },

  onModelChangeState: function(model, val) { //jshint unused: true
    this.set('state', val);
    switch (this.roomMenuModel.get('state')) {
      case 'all':
        this.onAll();
        break;
      case 'search':
        this.onSearch();
        break;
      case 'favourite':
        this.onFavourite();
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
  onFavourite: function() { this.onDefault(); },
  onPeople:    function() { this.onDefault(); },
  onOrg:       function() { this.onDefault(); },
  onDefault:   function() { this.onDefault(); },

});
