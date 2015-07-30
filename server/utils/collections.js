/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var uniqueIds = require('mongodb-unique-ids');

exports.idsIn = function(ids) {
  return uniqueIds(ids).filter(function(id) { return !!id; });
};

exports.keys = function(object) {
    var k = [];
    for (var i in object) if (object.hasOwnProperty(i)) {
      k.push(i);
    }
    return k;
};

exports.extract = function(propertyName) {
    return function(item) {
      return item[propertyName];
    };
};

exports.indexById = function(array) {
  var a = {};
  if(array) {
    array.forEach(function(item) {
      if(item) {
        a[item.id || item._id] = item;
      }
    });
  }
  return a;
};

exports.indexByProperty = function(array, propertyName) {
  var a = {};
  if(array) {
    array.forEach(function(item) {
      if(item) {
        a[item[propertyName]] = item;
      }
    });
  }
  return a;
};

exports.hashArray = function(array) {
  var a = {};
  if (!array) return a;

  array.forEach(function(item) {
    a[item] = true;
  });

  return a;
};

/**
 * Given a list of ids and a list full results,
 * return the array of full results in the
 * same order as the ids
 */
exports.maintainIdOrder = function(ids, results) {
  var resultsIndexed = exports.indexById(results);
  return ids.map(function(id) {
      return resultsIndexed[id];
    })
    .filter(function(f) {
      return !!f;
    });
};

exports.predicates = {
  notNull: function(v) {
    return (v !== null) && (v !== undefined);
  }
};
