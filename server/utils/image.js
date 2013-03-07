/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var temp = require("temp");
var im = require('imagemagick');


function convert(fileName, width, height, options, callback) {
  var tempName = temp.path({prefix: 'thumbnail', suffix: '.jpg'});
  var suffix = '';

  if(options.thumbnail) {
    suffix = '^';
  } else if(options.preview) {
    suffix = '>';
  }

  var command =['-define',
    'jpeg:size=' + width + 'x' + height,
    '' + fileName + "[0]",
    '-auto-orient',
    '-thumbnail', width+ 'x' + height + suffix,
    '-gravity','Center',
    '-strip'];

  if(options.thumbnail) {
    command.push('-extent',width + 'x' + height);
  }

  command.push(tempName);

  im.convert(command,
    function(err/*, stdout, stderr*/) {
      if (err) return callback(err);

      callback(null, tempName);
    });
}

exports.generateThumbnail = function (fileName, width, height, callback) {
    convert(fileName, width, height, { thumbnail: true }, callback);
};

exports.generatePreview = function (fileName, width, height, callback) {
    convert(fileName, width, height, { preview: true }, callback);
};
