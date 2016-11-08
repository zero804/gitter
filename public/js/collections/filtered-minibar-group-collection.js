'use strict';

var sortAndFilters = require('gitter-realtime-client/lib/sorts-filters').model;
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var FilteredMinibarGroupCollection = SimpleFilteredCollection.extend({

  comparator: sortAndFilters.favourites.sort,

  /**
   * The base filter for this collection - all favourites
   */
  filterFn: sortAndFilters.favourites.filter,


  initialize: function(models, options) {
    SimpleFilteredCollection.prototype.initialize.call(this, models, options);
    this.dndCtrl = options.dndCtrl;
    this.groupCollection = options.groupCollection;
    this.roomCollection = options.roomCollection;

    this.listenTo(this.dndCtrl, 'minibar:update-favourite-group', this.onUpdateFavouriteGroup, this);
    this.listenTo(this.dndCtrl, 'minibar:remove-favourite-group', this.onRemoveFavouriteGroup, this);
  },

  onUpdateFavouriteGroup: function(id, type, siblingID) {
    var sibling = this.groupCollection.get(siblingID);
    var index = sibling ? sibling.get('favourite') : (this.getHighestFavourite() + 1);
    var max = this.roomCollection.max('favourite');

    //If we have a sibling and that sibling has the highest favourite value
    //then we have dropped the item in the second to last position
    //so we need to account for that
    if (!!sibling && !!max && (sibling.get('id') === max.get('id'))) {
      index = max.get('favourite');
    }

    var group;
    if(type === 'room') {
      var room = this.roomCollection.get(id);
      var groupId = room && room.get('groupId');
      group = groupId && this.groupCollection.get(groupId);
    }
    else if(type === 'group' || type === 'minibar-group') {
      group = id && this.groupCollection.get(id);
    }

    if(group) {
      group.set('favourite', index);
      group.save();
      this.add(group, { merge: true });
    }
  },

  onRemoveFavouriteGroup: function(id) {
    var group = id && this.groupCollection.get(id);

    if(group) {
      group.set('favourite', false);
      group.save();
    }
  },

  getHighestFavourite: function() {
    return (this.groupCollection.pluck('favourite')
      .filter(function(num) { return !!num; })
      .sort(function(a, b) { return a < b ? -1 : 1; })
      .slice(-1)[0] || 0);
  },

});

module.exports = FilteredMinibarGroupCollection;
