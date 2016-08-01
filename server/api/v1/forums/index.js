"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var getForum = require('gitter-web-fake-data').getForum;

module.exports = {

  id: 'forumId',

  show: function(req){
    if(!req.user) { throw new StatusError(404); }
    return Promise.resolve(getForum());
  },

  subresources: {
    'topics': require('./topics'),
  },

};
