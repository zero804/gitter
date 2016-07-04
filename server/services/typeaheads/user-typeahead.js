'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var BatchStream = require('batch-stream');
var Transform = require('stream').Transform;
var ElasticBulkUpdateStream = require('./elastic-bulk-update-stream');
var elasticClient = require('../../utils/elasticsearch-client').typeahead;
var uuid = require('node-uuid');
var debug = require('debug')('gitter:app:user-typeahead');

var INDEX_PREFIX = 'typeahead_';
var READ_INDEX_ALIAS = 'typeahead-read';
var WRITE_INDEX_ALIAS = 'typeahead-write';
var BATCH_SIZE = 1000;
var MEMBERSHIP_LIMIT = 600;

function query(text, roomId) {
  return Promise.resolve(
    elasticClient.suggest({
      size: 10,
      index: READ_INDEX_ALIAS,
      type: 'user',
      body: {
        suggest: {
          text: text,
          completion: {
            field: "suggest",
            context: { rooms: roomId },
            payload: ["_uid"]
          }
        }
      }
    })
  ).then(function(res) {
    var options = res.suggest[0].options
    var userIds = options.map(function(option) {
      return option.payload._uid[0].split('#')[1];
    });
    return userIds;
  });
}

function reindex() {
  var newIndex = INDEX_PREFIX + uuid.v4();

  return createIndex(newIndex)
    .then(function() {
      return setWriteAlias(newIndex)
    })
    .then(function() {
      return Promise.all([
        reindexUsers(),
        reindexMemberships()
      ]);
    })
    .then(function() {
      return setReadAlias(newIndex)
    })
    .then(function() {
      return removeUnusedIndicies();
    });
}

function addUserToRoom(userId, roomId) {
  return Promise.resolve(
    elasticClient.update(createReqRemoveMembership(userId, roomId))
  );
}

function removeUserFromRoom(userId, roomId) {
  return Promise.resolve(
    elasticClient.update(createReqAddMembership(userId, roomId))
  );
}

function updateUser(user) {
  return Promise.resolve(
    elasticClient.update(generateUserUpdate(user))
  );
}

module.exports = {
  query: query,
  reindex: reindex,
  addUserToRoom: addUserToRoom,
  removeUserFromRoom: removeUserFromRoom,
  updateUser: updateUser
};

function createIndex(name) {
  debug('creating index %s', name);
  return Promise.resolve(
    elasticClient.indices.create({
      index: name,
      body: {
        settings: {
          number_of_shards: 4,
          number_of_replicas: 1,
          mapper: {
            dynamic: false
          }
        },
        mappings: {
          user: {
            dynamic: "strict",
            properties: {
              suggest: {
                type: "completion",
                analyzer: "simple",
                search_analyzer: "simple",
                preserve_separators: false,
                contexts: [{ name: "rooms", type: "category" }]
              }
            }
          }
        }
      }
    })
  );
}

function setWriteAlias(index) {
  debug("setting %s as sole write alias (%s)", index, WRITE_INDEX_ALIAS);
  return Promise.resolve(
    elasticClient.indices.updateAliases({
      body: {
        actions: [
          { remove: { index: INDEX_PREFIX + '*', alias: WRITE_INDEX_ALIAS } },
          { add: { index: index, alias: WRITE_INDEX_ALIAS } }
        ]
      }
    })
  );
}

function setReadAlias(index) {
  debug("setting %s as sole read alias (%s)", index, READ_INDEX_ALIAS);
  return Promise.resolve(
    elasticClient.indices.updateAliases({
      body: {
        actions: [
          { remove: { index: INDEX_PREFIX + '*', alias: READ_INDEX_ALIAS } },
          { add: { index: index, alias: READ_INDEX_ALIAS } }
        ]
      }
    })
  );
}

function removeUnusedIndicies() {
  return Promise.resolve(elasticClient.indices.getAliases())
    .then(function(resp) {
      var unused = Object.keys(resp).filter(function(index) {
        var aliases = Object.keys(resp[index].aliases)
        return index.indexOf(INDEX_PREFIX) === 0 && aliases.length === 0;
      });

      if (!unused.length) return;

      debug("removing indices %j", unused);
      return elasticClient.indices.delete({ index: unused });
    });
}

function reindexUsers() {
  return new Promise(function(resolve, reject) {
    var userStream = persistence.User.find()
      .lean()
      .read('secondaryPreferred')
      .batchSize(BATCH_SIZE)
      .stream();

    var elasticTransformStream = new Transform({
      readableObjectMode: true,
      writableObjectMode: true,
      transform: function(user, encoding, callback) {
        this.push(createReqUpdateUser(user));
        callback();
      }
    });

    var batchStream = new BatchStream({ size: BATCH_SIZE });

    var elasticBulkUpdateStream = new ElasticBulkUpdateStream(elasticClient);

    userStream
      .on('error', reject)
      .pipe(elasticTransformStream)
      .on('error', reject)
      .pipe(batchStream)
      .on('error', reject)
      .pipe(elasticBulkUpdateStream)
      .on('error', reject)
      .on('finish', resolve);
  });
}

function reindexMemberships() {
  return new Promise(function(resolve, reject) {
    var troupeUserStream = persistence.TroupeUser.aggregate([
      {
        $lookup: {
          from: 'troupes',
          localField: 'troupeId',
          foreignField: '_id',
          as: 'troupe'
        }
      },
      {
        $match: {
          // if we allowed oneToOnes, then @mydigitalself would break elasticsearch!
          // field is missing if not one to one, but true if it is
          'troupe.oneToOne': { $ne: true }
        }
      },
      {
        $project: {
          // id is included by default but we dont need it
          _id: false,
          userId: true,
          troupeId: true
        }
      },
      {
        $group: {
          _id: '$userId',
          troupeIds: { $push: '$troupeId' }
        }
      }
    ])
    .allowDiskUse(true)
    .read('secondaryPreferred')
    .cursor({ batchSize: BATCH_SIZE })
    .exec()
    .stream();

    var elasticTransformStream = new Transform({
      readableObjectMode: true,
      writableObjectMode: true,
      transform: function(obj, encoding, callback) {
        this.push(createReqAddMembership(obj._id, obj.troupeIds));
        callback();
      }
    });

    var batchStream = new BatchStream({ size: BATCH_SIZE });

    var elasticBulkUpdateStream = new ElasticBulkUpdateStream(elasticClient);

    troupeUserStream
      .on('error', reject)
      .pipe(elasticTransformStream)
      .on('error', reject)
      .pipe(batchStream)
      .on('error', reject)
      .pipe(elasticBulkUpdateStream)
      .on('error', reject)
      .on('finish', resolve);
  });
}

function createReqUpdateUser(user) {
  var id = user._id.toString();
  var input = [user.username];
  if (user.displayName) {
    // for matching "Andy Trevorah" with "andy", "trev", or "andy t"
    var names = user.displayName.split(' ').filter(Boolean);
    input = input.concat(user.displayName, names);
  }

  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: id,
    body: {
      doc: {
        suggest: {
          input: input
        }
      },
      upsert: {
        suggest: {
          input: input,
          contexts: {
            rooms: ["*"]
          }
        }
      }
    },
    _retry_on_conflict: 3
  }
}

function createReqAddMembership(userId, roomIds) {
  var id = userId.toString();
  var newRooms = roomIds.map(function(roomId) {
    return roomId.toString();
  });

  if (newRooms.length > MEMBERSHIP_LIMIT) {
    // going over the limit can cause a too_complex_to_determinize_exception
    // from elastic as the automaton has a total limit of 10000 states.
    debug('%s is in %d rooms which is over the limit of %d. probably troll; ignoring update', userId, newRooms.length, MEMBERSHIP_LIMIT);
    newRooms = [];
  }

  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: id,
    body: {
      // ensures roomIds are unique and that the update doenst go over the membership limit
      script: 'ctx._source.suggest.contexts.rooms = (ctx._source.suggest.contexts.rooms + new_rooms).unique(false).take(' + MEMBERSHIP_LIMIT + ')',
      params: {
        new_rooms: newRooms
      },
      upsert: {
        suggest: {
          contexts: {
            rooms: ['*'].concat(newRooms)
          }
        }
      }
    },
    _retry_on_conflict: 3
  }
}

function createReqRemoveMembership(userId, roomId) {
  return {
    index: WRITE_INDEX_ALIAS,
    type: 'user',
    id: userId.toString(),
      body: {
      script: "ctx._source.suggest.contexts.rooms = ctx._source.suggest.contexts.rooms -= roomId",
      params: {
        roomId: roomId.toString()
      },
      upsert: {
        suggest: {
          contexts: {
            rooms: ["*"]
          }
        }
      }
    },
    _retry_on_conflict: 3
  }
}
