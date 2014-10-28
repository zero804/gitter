#!/bin/bash -xe

ROOM_URI=$(echo $1 | tr '[:upper:]' '[:lower:]')

if [[ -z $ROOM_URI ]]; then
  echo usage $0 ROOM_URI
  exit 1
fi

execute_local() {
  mongo --quiet localhost/gitter --eval "rs.slaveOk(); $1"
}

execute_prod() {
  mongo --quiet mongo-replica-member-004/gitter --eval "rs.slaveOk(); $1"
}

PROD_ROOM_ID=$(execute_prod "db.troupes.findOne({ lcUri: '$ROOM_URI' }, { _id: 1 })._id.valueOf()")

if [[ -z $PROD_ROOM_ID ]]; then
  echo "Unable to find room in prod"
  exit 1
fi

DEV_ROOM_ID=$(execute_local "db.troupes.findOne({ lcUri: '$ROOM_URI' }, { _id: 1 })._id.valueOf()")
if [[ -z $DEV_ROOM_ID ]]; then
  echo "Unable to find room in dev"
  exit 1
fi

DEV_USER_ID=$(execute_local "db.users.findOne({}, { _id: 1 })._id.valueOf()")
if [[ -z $DEV_USER_ID ]]; then
  echo "Unable to find a local userid"
  exit 1
fi

mongoexport -h mongo-replica-member-004 -d gitter -c chatmessages -q "{ toTroupeId: ObjectId('$PROD_ROOM_ID') }" --jsonArray > /tmp/chats.json

node -e "
  var data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (d) {
    data = data + d;
  });
  process.stdin.on('end', function () {
    // put all your code here
    var array = JSON.parse(data);
    array.forEach(function(d) {
      if(d.toTroupeId) {
        d.toTroupeId.\$oid = '$DEV_ROOM_ID';        
      }     
      
      if(d.fromUserId) {
        d.fromUserId.\$oid = '$DEV_USER_ID';        
      }
    });
    console.log(JSON.stringify(array))
  });
  process.stdin.resume();
" < /tmp/chats.json > /tmp/chats2.json


mongoimport -h localhost -d gitter -c chatmessages --jsonArray < /tmp/chats2.json
