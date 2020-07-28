'use strict';

class PassthroughStrategy {
  preload() {}

  map(item) {
    return item;
  }
}

module.exports = PassthroughStrategy;
