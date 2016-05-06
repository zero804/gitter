"use strict";

var stream = require("stream");
var util = require("util");

exports.readStreamIntoString = function(input, callback) {
  // note, piping the input instead of just listening to events is a much safer implementation,
  // haraka at least doesn't seem to provide the message stream with altered messages if we don't use pipe.
  var sink = new exports.StringStream();

  sink.on('end', function(data) {
    callback(null, data);
  });

  input.pipe(sink);
};

exports.StringStream = function() {
  stream.Stream.call(this);
  this.writable = true;

  var str = "";

  this.write = function(chunk) {
    str += (chunk || "").toString("utf-8");
  };

  this.end = function(chunk) {
    str += (chunk || "").toString("utf-8");
    this.emit('end', str);
  };

};

util.inherits(exports.StringStream, stream.Stream);
