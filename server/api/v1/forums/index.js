"use strict";

var Promise = require('bluebird');

module.exports = {
  id: 'groupId',
  show: function(req, res){
    return Promise.resolve({ key: 'THIS IS THE NEWS' });
  }
};
