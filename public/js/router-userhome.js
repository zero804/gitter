'use strict'
var context = require('utils/context');
var _       = require('underscore');
require('utils/frame-utils');

window.addEventListener('message', function(message) {

  if (message.origin !== context.env('basePath')) return;

  //parse our payload
  var data;
  if (_.isString(message.data)) {
    try {
      data = JSON.parse(message.data);
    }
    catch (e) {
      //FIXME JP 8/9/15 Should so something with this error
      data = message.data;
    }
  }  else {
    data = message.data;
  }

  if (data.type !== 'change:room') return;
  document.location.href = data.url;
});
