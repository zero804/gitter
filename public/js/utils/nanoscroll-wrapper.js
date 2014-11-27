'use strict';

var Mutant = require('mutant')
var $ = require('jquery');
var _ = require('underscore');
require('nanoscroller');

function MutantWrapper(target, options) {
  this.$target = $(target);
  var adjustNanoScrollerThrottled = _.throttle(this.adjust.bind(this), 100, { leading: false });
  this.mutant = new Mutant(target, adjustNanoScrollerThrottled, { transitions: true, observers: { attributes: true, characterData: true  } } );
  this.$target.nanoScroller(options);
}

MutantWrapper.prototype = {
  disconnect: function() {
    this.mutant.disconnect();
    this.$target.nanoScroller({ destroy: true });
  },

  adjust: function() {
    this.$target.nanoScroller();
  }
}

module.exports = function(target, options) {
  return new MutantWrapper(target, options);
}
