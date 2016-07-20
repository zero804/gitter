"use strict";

var Promise = require('bluebird');

module.exports = {
  id: 'topicId',
  index: function(req, res){
    return Promise.resolve(200);
  }
};
