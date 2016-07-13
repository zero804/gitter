'use strict';

var one2oneFilter = require('gitter-web-shared/filters/left-menu-primary-one2one');
var orgFilter = require('gitter-web-shared/filters/left-menu-primary-org');
var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;
var SimpleFilteredCollection = require('./simple-filtered-collection');

var FilteredRoomCollection = SimpleFilteredCollection.extend({
  initialize: function(models, options) {
    if (!options || !options.roomModel) {
      throw new Error('A valid RoomMenuModel must be passed to a new instance of FilteredRoomCollection');
    }

    this.roomModel = options.roomModel;
    this.listenTo(this.roomModel, 'change:state change:selectedOrgName', this.onModelChangeState);

    this.listenTo(this, 'change add', this.applyHideCriteria);
    this.listenTo(this, 'reset', this.reapplyHideCriteria);

    this.onModelChangeState();
  },

  /**
   * The sort comparator for this filtered collection
   */
  comparator: sortAndFilters.recents.sort,

  /**
   * This is used to filter out what items will be
   * in this collection, hidden and visible
   */
  filterFn: sortAndFilters.recents.filter,

  /**
   * Predicates used for hiding items in this view
   */
  visiblePredicates: {
    people: function(model) {
      return one2oneFilter(model.attributes);
    },

    search: function() {
      return false;
    },

    org: function(model) {
      var orgName = this.roomModel.get('selectedOrgName');
      return orgFilter(model.attributes, orgName);
    },

    default: sortAndFilters.recents.filter
  },

  /**
   * Switch the predicate
   */
  onModelChangeState: function() {
    var state = this.roomModel.get('state');
    switch (state) {
      case 'people':
      case 'search':
      case 'org':
        this.setVisibilePredicate(this.visiblePredicates[state].bind(this));
        break;
      default:
        this.setVisibilePredicate(this.visiblePredicates.default);
        break;
    }
  },

  /**
   * Set or clear isHidden for a single model
   */
  applyHideCriteria: function(model) {
    var visible = !!this._visiblePredicate(model);
    var currentlyVisible = !model.get('isHidden');
    if (currentlyVisible !== visible) {
      model.set('isHidden', !visible);
    }
  },

  /**
   * Set or clear isHidden for the entire collection
   */
  reapplyHideCriteria: function() {
    this.forEach(function(model) {
      this.applyHideCriteria(model);
    }, this);
  },

  /**
   * Change the predicate and reapply
   */
  setVisibilePredicate: function(predicate) {
    this._visiblePredicate = predicate;
    this.reapplyHideCriteria();
  },

});

module.exports = FilteredRoomCollection;
