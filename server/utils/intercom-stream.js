"use strict";

var util = require('util');
var debug = require('debug')('gitter::intercom-stream');

var Readable = require('stream').Readable;
util.inherits(IntercomStream, Readable);

function IntercomStream(options, makePromise) {
  if (options.batchPages) {
    // In testing I found that for some reason you have to set highWaterMark
    // wherever you pipe this too, otherwise it will still kick off 16 requests
    // shortly after the other. If you're not batching by page, then that's a
    // non-issue because there's always going to be more than the default of 16
    // per page.
    options.highWaterMark = 1;
  }
  options.objectMode = true;
  this.client = options.client;
  this.key = options.key;
  this.batchPages = options.batchPages;
  this.makePromise = makePromise;
  this.reads = 0;
  this.pushes = 0;
  Readable.call(this, options);
}

IntercomStream.prototype._read = function() {
  this.reads++;
  debug('read', this.reads);

  // MakePromise will only exist at this point the first time and if
  // back-pressure kicked in. In Normal operation this._nextPromise() will be
  // called immediately.
  if (this.makePromise) {
    debug('continue from _read');
    this._nextPromise();
  }
};

IntercomStream.prototype._nextPromise = function() {
  var stream = this;

  var promise = stream.makePromise();

  // only make/execute each one once
  stream.makePromise = null;

  promise.then(function(result) {
    debug('push', stream.pushes);
    if (stream.batchPages) {
      stream.pushes++;
      stream.push(result.body[stream.key]);
    } else {
      result.body[stream.key].forEach(function(result) {
        stream.pushes++;
        stream.push(result);
      });
    }

    if (result.body.pages && result.body.pages.next) {
      stream.makePromise = function() {
        return stream.client.nextPage(result.body.pages);
      };

      // if we were already asked for more, immediately execute the next
      // promise and push that data too
      if (stream.pushes < stream.reads) {
        debug('continue from _nextPromise', stream.pushes, stream.reads);
        stream._nextPromise();
      }

    } else {
      // all done!
      stream.push(null);
    }
  })
  .catch(function(err) {
    stream.emit('error', err);
  });
};

module.exports = IntercomStream;
