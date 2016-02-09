/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert            = require('assert');
var roomNameShortener = require('public/js/utils/room-menu-name-shortener');

describe('roomNameShortener()', function() {

  it('it should shorten strings longer than 19 characters', function() {
    var result = roomNameShortener('thisisareally/reallylongroomname');
    var expected = 'reallylongroomname';
    assert.equal(expected, result);
  });

  it('should not shorten strings shorter than 19 characters', function() {
    var result = roomNameShortener('gitterHQ/test');
    var expected = 'gitterHQ/test';
    assert.equal(expected, result);
  });

  it('should treat strings with extra /\'s differently ', function() {
    var result = roomNameShortener('gitterHQ/repo/channel');
    var expected = 'repo/channel';
    assert.equal(expected, result);
  });

});
