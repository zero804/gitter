var DoubleTapper = require('../../../public/js/utils/double-tapper');
var assert = require('assert');

describe('double-tapper', function() {

  it('sets tapCount to 0 by default', function() {
    var doubleTapper = new DoubleTapper();

    assert.equal(doubleTapper.tapCount, 0);
  });

  it('recognises a single click', function() {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();

    assert.equal(doubleTapper.tapCount, 1);
  });

  it('recognises an instant double click', function() {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    doubleTapper.registerTap();

    assert.equal(doubleTapper.tapCount, 2);
  });

  it('recognises a slow double click', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      doubleTapper.registerTap();

      assert.equal(doubleTapper.tapCount, 2);
      done();
    }, 200);
  });

  it('recognises a two single clicks', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      doubleTapper.registerTap();

      assert.equal(doubleTapper.tapCount, 1);
      done();
    }, 400);
  });

  it('recognises a triple click', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      doubleTapper.registerTap();

      setTimeout(function() {
        doubleTapper.registerTap();

        assert.equal(doubleTapper.tapCount, 3);
        done();
      }, 200);
    }, 200);
  });

});
