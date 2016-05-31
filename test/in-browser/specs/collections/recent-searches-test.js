/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var RecentSearchesCollection = require('../../../../public/js/collections/recent-searches.js');

describe('RecentSearchesCollection', function() {

  var recentSearchesCollection;
  beforeEach(function() {
    localStorage['left-menu-saved-searches'] = null;
    recentSearchesCollection = new RecentSearchesCollection([]);
  });

  afterEach(function(){
    recentSearchesCollection.reset([]);
  });

  it('should not add items with no name', function(){
    recentSearchesCollection.add({id: '1'});
    recentSearchesCollection.add({id: '2'});
    assert.equal(0, recentSearchesCollection.length);
  });

});
