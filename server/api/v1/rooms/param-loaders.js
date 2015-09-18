'use strict';

var troupeService = require("../../../services/troupe-service");
var StatusError   = require('statuserror');

exports.troupeLoader = function(req, res, next) {
   return troupeService.findById(req.params.troupeId)
    .then(function(troupe) {
      if (!troupe) throw new StatusError(404);
      req.troupe = troupe;
    })
    .nodeify(next);
};
