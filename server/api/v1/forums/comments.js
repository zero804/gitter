"use strict";

var Promise = require('bluebird');

module.exports = {

  id: 'commentId',
  index: function(){
    return Promise.resolve(200);
  }
};
