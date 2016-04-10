'use strict';
var qs = require('qs').parse(window.location.search);

var env = window.gitterClientEnv || {};
// Allow env through the querystring
if(qs.env) {
  var m;
  try {
    m = JSON.parse(qs.env);
  } catch(e) {
    // Ignore errors here
  }

  if(m) {
    Object.keys(m).forEach(function(k) {
      env[k] = m[k];
    });
  }
}

module.exports = env;
