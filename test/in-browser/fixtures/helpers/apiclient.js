'use strict';

var sinon = require('sinon');
var Promise = require('bluebird');

module.exports = {
  user: {
    delete: sinon.spy(),
    put: function(){
      //TODO find a better way of mocking this
      return { then: function(){ return { catch: function(){} }; }, catch: function(){} };
    }
  },
  priv: {
    channelGenerator: function(relativeUrl) {
      return relativeUrl;
    }
  },
  delete: sinon.stub().returns(Promise.resolve()),
  get: sinon.stub().returns(Promise.resolve())
};
