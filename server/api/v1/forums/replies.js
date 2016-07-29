"use strict";

var Promise = require('bluebird');
var fakeData = require('gitter-web-fake-data');

module.exports = {

  id: 'replyId',

  index: function(){
    return Promise.resolve(fakeData.getReplies());
  },

  show: function(){
    return Promise.resolve(fakeData.getReply());
  },

  subresources: {
    'comments': require('./comments'),
  },
};