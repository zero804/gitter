var opts = require('yargs')
  .script("addTag")
  .option('roomUri', {
    alias: 'r',
    description: 'The roomUri to be tagged.'
  })
  .option('tags', {
    alias: 't',
    description: 'A list of tags to be added.',
    type: 'array'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

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
  return room.save();
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
