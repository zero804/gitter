/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var gitterEnv = require('gitter-env');
var path = require('path');

/* Create a singleton environment */
module.exports = gitterEnv.create(path.join(__dirname, '..', '..', 'config'));
