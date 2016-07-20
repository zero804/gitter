"use strict";

var Promise = require('bluebird');

module.exports = {
  id: 'forumId',
  show: function(req, res){
    return Promise.resolve({ key: 'THIS IS THE NEWS' });
  }
};
