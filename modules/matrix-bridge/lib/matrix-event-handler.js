'use strict';

const assert = require('assert');

class MatrixEventHandler {
  constructor(matrixBridge, gitterBridgeUsername) {
    assert(matrixBridge);
    assert(gitterBridgeUsername);
    this.matrixBridge = matrixBridge;
    this._gitterBridgeUsername = gitterBridgeUsername;
  }

  async onEvent() {
    // TODO: process event
  }
}

module.exports = MatrixEventHandler;
