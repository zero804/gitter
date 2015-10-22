'use strict';

var troupeCollection = require('collections/instances/troupes');

module.exports = function roomListGenerator() {
  return troupeCollection.troupes.map(function(model) {
    return {
      name: model.get('name'),
      id: model.get('id'),
    };
  });
};
