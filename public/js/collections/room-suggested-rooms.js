'use strict';

var BaseResolverCollection = require('./base-resolver-collection');

module.exports = BaseResolverCollection.extend({
  template: '/v1/rooms/:roomId/suggestedRooms' ,
});
