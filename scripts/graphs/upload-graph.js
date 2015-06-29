/* jshint node:true, unused:true */
'use strict';

var express  = require('express');
var app = express();
var http = require('http');
var os = require('os');
var membershipStream = require('./membership-stream');
var roomStream = require('./room-stream');
var userStream = require('./user-stream');
var cypher = require("cypher-promise");
var neo4jClient = cypher('http://192.168.99.100:7474');

app.get('/users.csv', function(req, res){
  res.set('Content-Type', 'text/csv');
  userStream().pipe(res);
});

app.get('/rooms.csv', function(req, res){
  res.set('Content-Type', 'text/csv');
  roomStream().pipe(res);
});

app.get('/membership.csv', function(req, res) {
  res.set('Content-Type', 'text/csv');
  membershipStream().pipe(res);
});

var server = http.createServer(app);

function executeBatch(urlBase) {
  var now = Date.now();

  var operations = [
    'CREATE INDEX ON :User(userId)',
    'CREATE INDEX ON :Room(roomId)',
    /* Load users */
    'USING PERIODIC COMMIT LOAD CSV WITH HEADERS FROM "' + urlBase + '/users.csv" AS row MERGE (user:User {userId: row.userId }) SET user.username = row.username;',

    /* Load rooms */
    'USING PERIODIC COMMIT LOAD CSV WITH HEADERS FROM "' + urlBase + '/rooms.csv" AS row MERGE (room:Room {roomId: row.roomId }) SET room.uri = row.uri',

    /* Setup MEMBER relationship */
    'USING PERIODIC COMMIT LOAD CSV WITH HEADERS FROM "' + urlBase + '/membership.csv" AS row ' +
      'MATCH (u:User { userId: row.userId }), (r:Room { roomId: row.roomId }) ' +
      'MERGE (u)-[m:MEMBER]->(r) SET m.batch=' + now,

    /* Delete relationships from previous batches */
    'MATCH (u:User)-[m:MEMBER]-() WITH m WHERE m.batch <> ' + now + ' DELETE m'
  ];

  return (function next() {
    var op = operations.shift();
    if (!op) return;
    return neo4jClient.query(op)
      .catch(function(e) {
        console.error(e);
        console.error(e.stack);
        throw new Error('Error executing ' + op + ', code=' + e.code, ', message=' + e.message + ', name=' + e.name);
      })
      .then(next);
  })();
}

server.listen(function() {
  var externalAddress = getExternalIp();
  var port = server.address().port;
  console.log("opened server on %s", externalAddress + ":" + port);

  return executeBatch("http://" + externalAddress + ":" + port)
    .then(function() {
      process.exit();
    })
    .catch(function(err) {
      console.error(err.stack);
      process.exit(1);
    })
    .done();
});

function getExternalIp() {
  var ifaces = os.networkInterfaces();

  if (process.env.LISTEN_IF) {
    return ifaces[process.env.LISTEN_IF].address;
  }

  var ifaceNames = Object.keys(ifaces);

  for(var i = 0; i < ifaceNames.length; i++) {
    var ifaceName = ifaceNames[i];
    var ifaceList = ifaces[ifaceName];
    for (var j = 0; j < ifaceList.length; j++) {
      var iface = ifaceList[j];

      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' &&  !iface.internal) {
        return iface.address;
      }
    }
  }

}
