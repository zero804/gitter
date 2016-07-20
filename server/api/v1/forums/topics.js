"use strict";

var Promise = require('bluebird');
var getTopics = require('gitter-web-fake-data').getTopics;

module.exports = {
  id: 'topicId',
  index: function(req, res){
    return Promise.resolve(getTopics());
  },
  show: function (){
    return Promise.resolve(200);
  },
};
