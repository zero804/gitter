'use strict';

var rawFilter   = require('gitter-realtime-client/lib/sorts-filters').pojo.leftMenu.filter;
var modelFilter = require('gitter-realtime-client/lib/sorts-filters').model.leftMenu.filter;

module.exports = function defaultCollectionFilter(room){
  return !!room.get ? modelFilter(room) : rawFilter(room);
};
