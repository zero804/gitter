var opts = require("nomnom")
  .script("addTag")
  .option('roomUri', {
    abbr: 'r',
    help: 'The roomUri to be tagged.'
  })
  .option('tags', {
    abbr: 't',
    help: 'A list of tags to be added.',
    list: true
  })
  .parse();

var troupeService = require('../../server/services/troupe-service');
var persistenceService = require('../../server/services/persistence-service');

var roomUri = opts.roomUri;
var tags = opts.tags;

function dedupe(item, index, arr) {
  return (arr.indexOf(item) === index);
}

if (roomUri && tags) {
  tagRoom(opts.roomUri, opts.tags);
} else {
  console.log(new Error('You must provide a room AND one or more tags.'));
}

function addTag(room) {
  if (!room) throw new Error('Room not found.');
  room.tags = room.tags.concat(tags).filter(dedupe);
  return room.saveQ();
}

function tagRoom(uri, tags) {
  console.log('tagging', uri, '...');

  troupeService
    .findByUri(uri)
    .then(addTag)
    .then(function (room) {
      console.log('done.');
      process.exit();
    })
    .catch(function (err) {
      console.log(err);
      process.exit(1);
    });
}