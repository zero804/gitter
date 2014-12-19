/*jslint node:true, unused:true*/
/*global describe:true, it:true */
'use strict';

var isValidRoomUri = require('../../../public/js/utils/valid-room-uri');
var RESERVED = require('../../../public/js/utils/vanity-keywords');
var assert = require('assert');

describe.only('valid-room-uri', function () {

  it('rejects vanity keywords', function () {
    RESERVED.forEach(function (keyword) {
      assert.equal(isValidRoomUri('/' + keyword), false);
    });
  });

  it('rejects archive links', function () {

  });
});
