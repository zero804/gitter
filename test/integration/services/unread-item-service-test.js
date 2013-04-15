/*jslint node:true, unused:true*/
/*global describe:true, it:true*/
"use strict";

var testRequire = require('../test-require');

var assert = require('assert');
var unreadItemService = testRequire("./services/unread-item-service");

describe('unread-item-service', function() {

  it('getOldestId', function() {
    var ids = ['51262ec7b1b16e01c800000e', '5124c3a95e5e661947000005'];
    var oldest = unreadItemService.testOnly.getOldestId(ids);
    assert(oldest === '5124c3a95e5e661947000005', 'Expected the older date stamp to be returned');

    // With duplicates
    ids = ['51262ec7b1b16e01c800000e', '5124c3a95e5e661947000005', '5124c3a95e5e661947000005'];
    oldest = unreadItemService.testOnly.getOldestId(ids);
    assert(oldest === '5124c3a95e5e661947000005', 'Expected the older date stamp to be returned');


    // With duplicates
    ids = [];
    oldest = unreadItemService.testOnly.getOldestId(ids);
    assert(oldest === null, 'Expected null to be returned for an empty array');


  });

});