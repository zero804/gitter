/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

/**
 * Filter nulls
 * @return {Array} array with no null values.
 */
Array.prototype.filterNulls = function() {
  return this.filter(function(f) {
    return !(f === null || f === undefined);
  });
};

/**
 * Push all the items in an array
 */
Array.prototype.pushAll = function(items) {
  Array.push.apply(this, items);
};

/**
 * Index an array
 * @return {Object} hash of ids.
 */
Array.prototype.indexById = function() {
  var a = {};
  this.forEach(function(item) {
    a[item._id] = item;
  });

  return a;
};

function keys(object) {
    var k = [];
    for (var i in object) if (object.hasOwnProperty(i)) {
      k.push(i);
    }
    return k;
}

function extract(propertyName) {
    return function(item) {
      return item[propertyName];
    };
}

/**
 * Index an array
 * @return {Object} hash of ids.
 */
Array.prototype.distinct = function() {
  var a = {};
  this.forEach(function(item) {
    a[item] = 1;
  });

  return keys(a);
};

module.exports = {
  keys: keys,
  extract: extract
};

