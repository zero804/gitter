var util = require('util');
var graphviz = require('graphviz');
var fs = require('fs');

var persistenceService = require('../../server/services/persistence-service');

// Create digraph G
var g = graphviz.digraph("G");

persistenceService.Troupe.findQ({}, 'oneToOne users.userId')
  .then(function(rooms) {
    rooms.forEach(function(room) {
      if(room.oneToOne) {
        if(room.users[0] && room.users[1]) {

          var userId1 = room.users[0].userId;
          var userId2 = room.users[1].userId;
          if(userId1 && userId2) {
            g.addNode("" + userId1, { shape: "point" } );
            g.addNode("" + userId2, { shape: "point" } );

            g.addEdge("" + userId1, "" + userId2);
            g.addEdge("" + userId2, "" + userId1);
          }
        }
      } else {
        if(!room.users || !room.users.length) return;
        g.addNode("" + room.id, { shape: "point" });

        room.users.forEach(function(roomUser) {
          if(roomUser.userId) {
            g.addNode("" + roomUser.userId, { shape: "point" } );
            g.addEdge("" + roomUser.userId, "" + room.id, { arrowhead: "halfopen" });
          }
        });
      }
    });

    fs.writeFileSync('d.dot',  g.to_dot());
    // g.output( "png", "test01.png" );
    process.exit(0);
  })
  .fail(function(err) {
    console.error(err);
    process.exit(1);
  });


