var assert = require('assert');
var roomTagger = require('../../../server/utils/room-tagger');

var ROOM = {
  topic: 'I have many skills, they also include testing javascript and php extensively.'
};

var REPO = {
  name: 'testREPO',
  language: "JavaScript",
  owner: {
    login: 'testUser1'
  },
  source: {
    owner: {
      login: 'famousUser1'
    }
  }
};

describe('room-tagger', function () {

  it('should work with repo information', function () {
    assert.deepEqual(roomTagger(ROOM, REPO), [
      'testREPO',
      'JavaScript',
      'testUser1',
      'famousUser1',
      'skills',
      'include',
      'testing',
      'javascript',
      'php',
      'extensively'
    ], 'tags differ');
  });

  it('should work without repo information', function () {
    assert.deepEqual(roomTagger(ROOM), [
      'skills',
      'include',
      'testing',
      'javascript',
      'php',
      'extensively',
      'english',
      'danish',
      'pidgin'
    ], 'tags differ');
  });
});