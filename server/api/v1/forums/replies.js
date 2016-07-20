"use strict";

var Promise = require('bluebird');
var fakeData = require('gitter-web-fake-data');

module.exports = {
  id: 'replyId',
  index: function(){
    return Promise.resolve(200);
  }
};
