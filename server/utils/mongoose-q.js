"use strict";

var mongoose = require('mongoose');
var Q = require('q');

// TODO: remove this once we can drop mongoose Q
// Awaiting https://github.com/Automattic/mongoose/issues/3307
mongoose = require('mongoose-q')(mongoose, { spread: true });

// Switch over to Bluebird soon!
// mongoose.Promise = require('bluebird'); //Q.Promise;

mongoose.Promise = Q.Promise;

module.exports = mongoose;
