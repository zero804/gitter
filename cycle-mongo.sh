#!/bin/bash

set -e

export ARBITER=localhost:27019

find_primary() {
  mongo $ARBITER --eval '
        var status = rs.status();
        var primary = status.members.filter(function(f) { return f.state == 1; })[0];
        if(!primary) throw "No primary";
        if(status.members.filter(function(s) { return s.state === 2 && s.health !== 1}).length > 0) throw "Secondary unhealth";
        print(primary._id)' --quiet
}

while true; do
  while ! find_primary; do
    sleep 5
  done

  primary=$(find_primary)
  sleep 20

  echo Primary is not $primary

  echo stop mongodb-$primary
  sleep 5
  echo start mongodb-$primary
  sleep 5
done;