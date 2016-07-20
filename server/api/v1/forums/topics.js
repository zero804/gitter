"use strict";

var Promise = require('bluebird');
var fakeData = require('gitter-web-fake-data');

module.exports = {
  id: 'topicId',
  index: function(req, res){
    return Promise.resolve(fakeData.getTopics());
  },
  show: function (){
    return Promise.resolve(fakeData.getTopic());
  },
};
