/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var RecentSearchesCollection = require('../../../../public/js/collections/recent-searches.js');

describe('RecentSearchesCollection', function(){

  var recentSearchesCollection;
  beforeEach(function(){
    recentSearchesCollection = new RecentSearchesCollection();
  });

  it('should only add uniq items to the collection', function(){
    recentSearchesCollection.add({name: '1'});
    recentSearchesCollection.add({name: '1'});
    assert.equal(1, recentSearchesCollection.length);
  });

});
