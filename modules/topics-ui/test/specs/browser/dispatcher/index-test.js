"use strict";

var assert = require('assert');
var dispatcher = require('../../../../browser/js/dispatcher');

describe('Dipatcher', function(){

  it('should allow event subscription', function(done){

    dispatcher.on('test', function(){
      assert(true);
      done();
    });

    dispatcher.trigger('test');

  });

});
