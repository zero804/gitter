'use strict';

const Promise = require('bluebird');
var StatusError = require('statuserror');
const restSerializer = require('../../serializers/rest-serializer');

function generateExportSubresource(key, getCursor, getStrategy) {
  return {
    id: key,
    respond: function(req, res) {
      res.end();
    },
    index: function(req, res) {
      return Promise.resolve()
        .then(() => {
          if(req.accepts('application/x-ndjson') !== 'application/x-ndjson') {
            // Not Acceptable
            throw new StatusError(406);
          }

          // https://github.com/ndjson/ndjson-spec#33-mediatype-and-file-extensions
          res.set('Content-Type', 'application/x-ndjson');
          // Force a download
          res.set('Content-Disposition', `attachment;filename=${key}.ndjson`);

          return Promise.props({
            cursor: getCursor(req),
            strategy: getStrategy(req),
          })
        })
        .then(({ cursor, strategy }) => {
          let isRequestCanceled = false;
          req.on('close', function() {
            isRequestCanceled = true;
          });

          return cursor.eachAsync(function(item) {
            // Someone may have canceled their download
            // Throw an error to stop iterating in `cursor.eachAsync`
            if(isRequestCanceled) {
              const requestClosedError = new Error('User closed request');
              requestClosedError.requestClosed = true;
              return Promise.reject(requestClosedError);
            }

            return restSerializer.serializeObject(item, strategy)
              .then((serializedItem) => {
                res.write(`${JSON.stringify(serializedItem)}\n`);
              });
          });
        })
        .catch((err) => {
          if(err.requestClosed) {
            // noop
          }
          // Only create a new error if it isn't aleady a StatusError
          else if(!(err instanceof StatusError)) {
            throw new StatusError(500, err);
          }

          throw err;
        });
    }
  }
}

module.exports = generateExportSubresource;
