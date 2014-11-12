"use strict";
var context = require('../utils/context');

module.exports = (function() {


  var hash = window.location.hash.substring(1);

  var troupeId;
  if(hash) {
    var parts = hash.split(/%7C|\|/i);
    troupeId = parts.shift();
    if(parts.length) {
      window.location.hash = '#' + parts.join('|');
    } else {
      window.location.hash = '';
    }

  }

  if(!troupeId) {
    /* No troupe? Pull it from localStorage */
    troupeId = window.localStorage.lastTroupeId;
  } else {
    /* There is a troupe set, save it to local storage */
    window.localStorage.lastTroupeId = troupeId;
  }

  if(troupeId) {
    context.setTroupeId(troupeId);
  }


})();

