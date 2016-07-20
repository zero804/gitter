"use strict";

var Promise = require('bluebird');

module.exprts = {
  id: 'groupId',
  index: function(req, res){
    return Promise.resolve(200);
  }
};
