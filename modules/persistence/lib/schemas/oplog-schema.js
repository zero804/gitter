'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var OplogSchema = new Schema({
  // Timestamp
  ts: {
    t: Number,
    i: Number
  },
	// The "h" field is an unique id for the operation.
	// This ensures that each operation is uniquely identified which, given
	// many similar operations can occur at the same time, is not a bad thing.
  h: Number,
	// version
  //v: Number,
	// Type of operation
  //  - n: noop
  //  - i: insert
  //  - u: update
  //  - d: delete
  //  - c: ???
  //  - db: announces presence of a database
  op: String,
	// Database and collection that is affected by the operation
  ns: String,
	// Actual operation document
  o: Schema.Types.Mixed
}, { strict: 'throw' });

OplogSchema.schemaTypeName = 'OplogSchema';

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Oplog', OplogSchema);

    return {
      model: Model,
      schema: OplogSchema
    };
  }
};
