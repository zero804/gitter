/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var Stream = require("stream").Stream;
var utillib = require("util");
var console = require("console");

function RawMailComposer(options){
    Stream.call(this);
    this.writable = true;
    options = options || {};
    this.options = options;
    this.destinations = options.destinations;
    this.source = options.source;
}
utillib.inherits(RawMailComposer, Stream);

RawMailComposer.prototype.streamMessage = function() {
  this.options.message.pipe(this);
};

RawMailComposer.prototype.end = function(){
  this.emit("end");
};

RawMailComposer.prototype.write = function(buffer) {
  this.emit("data", buffer);
  return true; // keep sending
};

module.exports = RawMailComposer;