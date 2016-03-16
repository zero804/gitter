/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var getRoomAvatar = require('../../../../shared/avatars/get-room-avatar');


describe('getRoomAvatar', function(){

  it('should throw an error if no roomName is passed', function(){
    try{
      getRoomAvatar();
    }
    catch(e){
      assert.equal(e.message,
                  'A valid room name must be passed to getRoomAvatar');
    }
  });

  it('should return the correct room avatar url', function(){
    var result = getRoomAvatar('gitterHQ');
    var expected = 'https://avatars1.githubusercontent.com/gitterHQ';
    assert.equal(expected, result);
  });

  it('should return the correct room avatar url for a channel', function(){
    var result = getRoomAvatar('gitterHQ/test-1');
    var expected = 'https://avatars1.githubusercontent.com/gitterHQ';
    assert.equal(expected, result);
  });

  it('should sanitise a username and return the correct result', function(){
    var result = getRoomAvatar('Ricardo Baeta');
    var expected = 'https://avatars1.githubusercontent.com/RicardoBaeta';
    assert.equal(expected, result);
  });

});
