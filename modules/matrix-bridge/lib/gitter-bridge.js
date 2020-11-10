'use strict';

const assert = require('assert');
const appEvents = require('gitter-web-appevents');

const MatrixUtils = require('./matrix-utils');

class GitterBridge {
  constructor(matrixBridge) {
    assert(matrixBridge);
    this.matrixBridge = matrixBridge;
    this.matrixUtils = new MatrixUtils(matrixBridge);

    appEvents.onDataChange2(this.onDataChange.bind(this));
  }

  async onDataChange() {
    // TODO: process event
  }
}

module.exports = GitterBridge;
