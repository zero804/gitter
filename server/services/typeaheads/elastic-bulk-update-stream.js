'use strict';

var Writable = require('stream').Writable;
var util = require('util');
var debug = require('debug')('gitter:app:elastic-bulk-update-stream');

function ElasticBulkUpdateStream(elasticClient) {
  this._elasticClient = elasticClient;
  Writable.call(this, { objectMode: true });
}

util.inherits(ElasticBulkUpdateStream, Writable);

// expects an array of updates where each element is a valid req for elasticClient.update
ElasticBulkUpdateStream.prototype._write = function(updates, encoding, callback) {
  debug('uploading %d updates', updates.length);

  var req = {
    body: updates.reduce(function(body, update) {
      body.push({
        update: {
          _index: update.index,
          _type: update.type,
          _id: update.id,
          _retry_on_conflict: update._retry_on_conflict
        }
      });
      body.push(update.body)
      return body;
    }, [])
  };

  this._elasticClient.bulk(req, function(err, resp) {
    if (err) {
      return callback(err);
    }

    var respErrors = getErrors(req, resp)
    if (respErrors) {
      return callback(new Error('elastic bulk upload failed for some. failures: ' + JSON.stringify(respErrors, null, 2)));
    }

    return callback();
  });
};

function getErrors(req, resp) {
  if (!resp.errors) return;

  var errors = [];

  resp.items.forEach(function(item, index) {
    if (item.update.error) {
      errors.push({
        path: req.body[index * 2],
        body: req.body[(index * 2) + 1],
        resp: item
      });
    }
  });

  return errors;
}

module.exports = ElasticBulkUpdateStream;
