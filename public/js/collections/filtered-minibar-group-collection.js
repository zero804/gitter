'use strict';

var defaultFilter = require('gitter-web-shared/filters/left-menu-minibar-default');
var SimpleFilteredCollection = require('./simple-filtered-collection');

var FilteredMinibarGroupCollection = SimpleFilteredCollection.extend({
  /**
   * This is used to filter out what items will be
   * in this collection, hidden and visible
   */
  filterFn: defaultFilter,

});

module.exports = FilteredMinibarGroupCollection;
