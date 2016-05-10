"use strict";

function TagsStrategy() {
  this.preload = function() { };

  this.map = function(room) {
    return room.tags || [];
  };
}

TagsStrategy.prototype = {
  name: 'TagsStrategy'
};

module.exports = TagsStrategy;
