/*jslint node:true, unused:true*/
/*global describe:true, it:true */
'use strict';

var isValidRoomUri = require('../../../public/js/utils/valid-room-uri');
var RESERVED = require('../../../public/js/utils/vanity-keywords');
var assert = require('assert');

describe('valid-room-uri', function () {

  it('rejects vanity keywords', function () {
    RESERVED
      .forEach(function (keyword) {
        assert.equal(isValidRoomUri('/' + keyword), false);
      });
  });

  it('rejects undefined and empty string', function () {
    assert.equal(isValidRoomUri(), false);
    assert.equal(isValidRoomUri(''), false);
    assert.equal(isValidRoomUri('a'), false);
  });

  it('rejects archive links', function () {
    assert.equal(isValidRoomUri('/gitterHQ/gitter/archives/all'), false);
    assert.equal(isValidRoomUri('/gitterHQ/gitter/archives/2014/12/11'), false);
  });

  it('accepts room URIs', function () {
    assert(isValidRoomUri('/gitterHQ'));
    assert(isValidRoomUri('/gitterHQ/gitter'));
    assert(isValidRoomUri('/gitterHQ/gitter/channel'));
  });
});
