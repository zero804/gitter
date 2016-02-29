'use strict';

var sinon = require('sinon');
var Promise = require('bluebird');

module.exports = {
  user: {
    delete: sinon.spy(),
    put: function(){
      //TODO find a better way of mocking this
      return { then: function(f){ return { catch: function(){} }; }, catch: function(){} };
    }
  },
  delete: sinon.stub().returns(Promise.resolve())
};
