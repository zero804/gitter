/*jslint node:true, unused:true*/
/*global describe:true, it:true */
"use strict";

var assert = require('assert');
var testRequire = require('../test-require');
var avatar = testRequire('./utils/avatar');

describe('avatar url generator', function() {

  it('should create an avatar url for a repo room', function() {

    var room = {
      name: 'gitterHQ/gitter',
      uri: 'gitterHQ/gitter',
      url: '/gitterHQ/gitter'
    };

    var result = avatar(room);

    assert.equal(result, 'https://avatars.githubusercontent.com/gitterHQ');
  });

  it('should create an avatar url for a one to one room', function() {

    var room = {
      name: 'Andy Trevorah',
      uri: undefined,
      url: '/trevorah'
    };

    var result = avatar(room);

    assert.equal(result, 'https://avatars.githubusercontent.com/trevorah');
  });

});
