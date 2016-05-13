#!/usr/bin/env node
'use strict';

var graphviz = require('graphviz');
var fs = require('fs');

var persistenceService = require('gitter-web-persistence');

persistenceService.Troupe.find({}, 'oneToOne users.userId githubType security uri')
var mongoose      = require('gitter-web-mongoose-bluebird');

var Schema   = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var AggrSchema = new Schema({
  "troupeId1": { type: ObjectId },
  "troupeId2": { type: ObjectId },
  "commonUsers": { type: Number },
}, { collection: 'tmp_user_aggregation' });


// Create digraph G
var g = graphviz.digraph("G");
var c = 0;
var Model = mongoose.model('AggrSchema', AggrSchema);
Model.find()
  .select('troupeId1 troupeId2 commonUsers')
  .lean()
  .stream()
  .on('data', function(x) {
    c++;
    if (c % 1000 === 0) console.log(c);
    g.addNode("" + x.troupeId1);
    g.addNode("" + x.troupeId2);

    g.addEdge("" + x.troupeId1, "" + x.troupeId2, { weight: x.commonUsers });
  })
  .on('end', function() {
    fs.writeFileSync('room-connections-' + new Date().toISOString().replace(/:/g, '_') + '.dot',  g.to_dot());
    process.exit(0);
  });
