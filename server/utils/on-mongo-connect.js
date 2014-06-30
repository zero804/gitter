/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose = require('mongoose');

module.exports = function onMongoConnect(callback) {
  if(mongoose.connection.readyState === 1) {
    setImmediate(callback);
  } else {
    mongoose.connection.on('open', callback);
  }
};
