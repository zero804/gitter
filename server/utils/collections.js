/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

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

module.exports = {
  keys: keys,
  extract: extract,
  indexById: function(array) {
    var a = {};
    array.forEach(function(item) {
      a[item._id] = item;
    });

    return a;
  },

  predicates: {
      notNull: function(v) {
        return (v !== null) && (v !== undefined);
      }

  }
};

