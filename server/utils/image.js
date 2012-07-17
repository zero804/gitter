/*jshint globalstrict:true, trailing:false */
/*global require: true, module: true */

"use strict";

var sanitizer = require("sanitizer");
var console = require("console");
var temp = require("temp");
var im = require('imagemagick');
var winston = require('./winston');

module.exports = {
  generateThumbnail: function (fileName, width, height, callback) {
    var tempName = temp.path({prefix: 'thumbnail', suffix: '.jpg'});

    im.convert(['-define',
                'jpeg:size=' + width + 'x' + height,
                fileName + "[0]",
                '-auto-orient',
                '-thumbnail', width+ 'x' + height +'^',
                '-gravity','Center',
                '-extent',width + 'x' + height,
                tempName],
      function(err, stdout, stderr) {
        if (err) return callback(err);

        callback(null, tempName);
      });
  }
};
