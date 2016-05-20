var _ = require('lodash');
var metaService = require('../../../services/room-meta-service');

module.exports = {

  //This is not ideal but can't get the nested sub resource to work
  index: function(req) {
    if (!req.user) { throw new StatusError(401); }

    return metaService.findMetaByTroupeId(req.params.troupeId)
      .then(function(res) {
        res = (res || {});
        return { welcomeMessage: (res.welcomeMessage || {}) };
      });
  },

  create: function(req) {
    if (!req.user) { throw new StatusError(401); }

    var data = _.clone(req.body);
    return metaService.createNewMetaRecord(req.params.troupeId, data);
  },

  subresources: {
    welcomeMessage: require('./welcome-message'),
  }
};
