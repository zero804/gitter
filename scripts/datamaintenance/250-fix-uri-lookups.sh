#!/bin/bash

set -e

MONGO_URL=$1
if [ -z "$MONGO_URL" ]; then MONGO_URL=troupe; fi

mongo $MONGO_URL  <<"DELIM"
db.urilookups.find().forEach(function(u) {
	if(u.userId && u.troupeId) {
		db.urilookups.remove({ _id: u._id });
		return;
	}
	
	if(u.userId) {
		if(db.users.count({ _id : u.userId }) === 0) {
			db.urilookups.remove({ userId: u.userId });
		}

		return;
	}

	if(u.troupeId) {
		if(db.troupes.count({ _id : u.troupeId }) === 0) {
			db.urilookups.remove({ troupeId: u.troupeId });
		}
		return;
	}	

	db.urilookups.remove({ _id: u._id });
	
});
DELIM
