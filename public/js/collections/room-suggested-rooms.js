'use strict';

var BaseResolverCollection = require('./base-resolver-collection.js');

module.exports = BaseResolverCollection.extend({
  template: '/v1/rooms/:roomId/suggestedRooms' ,
});
