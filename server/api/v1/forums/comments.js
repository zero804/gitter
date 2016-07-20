"use strict";

var Promise = require('bluebird');
var fakeData = require('gitter-web-fake-data');

module.exports = {

  id: 'commentId',

  index: function(){
    return Promise.resolve(fakeData.getComments());
  }

};
