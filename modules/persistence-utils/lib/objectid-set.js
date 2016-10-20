'use strict';

function ObjectIDSet() {
  this._set = {};
  this._uniques = [];
}

ObjectIDSet.prototype = {
  add: function(id) {
    if (this._set[id]) {
      return false;
    }

    this._set[id] = true;
    this._uniques.push(id);
    return true;
  },

  uniqueIds: function() {
    return this._uniques;
  }
};

module.exports = ObjectIDSet;
