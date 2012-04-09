/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var Stream = require("stream").Stream;
var utillib = require("util");

function RawMailComposer(options){
    Stream.call(this);
    options = options || {};
    this.options = options;
    this.destinations = options.destinations;
    this.source = options.source;
}
utillib.inherits(RawMailComposer, Stream);

RawMailComposer.prototype.streamMessage = function(){
  this.emit("data", new Buffer(this.options.message, "utf-8"));
  this.emit("end");
};

module.exports = RawMailComposer;
