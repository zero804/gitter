'use strict';

var defaultFilter = require('gitter-web-shared/filters/left-menu-minibar-default');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var FilteredMinibarGroupCollection = SimpleFilteredCollection.extend({
  /**
   * This is used to filter out what items will be
   * in this collection, hidden and visible
   */
  filterFn: defaultFilter,


  initialize: function(models, options) {
    SimpleFilteredCollection.prototype.initialize.call(this, models, options);
    this.dndCtrl = options.dndCtrl;
    this.groupCollection = options.groupCollection;
    this.roomCollection = options.roomCollection;

    this.listenTo(this.dndCtrl, 'minibar:update-favourite-group', this.onUpdateFavouriteGroup, this);
  },

  onUpdateFavouriteGroup: function(id, type) {
    if(type === 'room') {
      var room = this.roomCollection.get(id);
      var groupId = room && room.get('groupId');
      var group = groupId && this.groupCollection.get(groupId);
      if(group) {
        this.add(group, { merge: true });
      }
    }
  },

});

module.exports = FilteredMinibarGroupCollection;
