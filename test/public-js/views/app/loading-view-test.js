/*jslint node:true, unused:true*/
/*global describe:true, it:true */

"use strict";

var assert = require('assert');
var LoadingView = require('proxyquire').noCallThru()('../../../../public/js/views/app/loading-view', {
  '../../utils/appevents': { on: function() {}},
});

describe('loading-view', function() {

  it('hides when page is already loaded', function(done) {
    var iframe = {
      contentDocument: {
        readyState: 'complete',
        addEventListener: function() {}
      },
      contentWindow: {
        removeEventListener: function() {},
        addEventListener: function() {}
      },
      addEventListener: function() {}
    };
    var loadingEl = {
      classList: {
        add: function(className) {
          assert(className, 'hide');
          done();
        }
      }
    };

    new LoadingView(iframe, loadingEl);
  });

});
