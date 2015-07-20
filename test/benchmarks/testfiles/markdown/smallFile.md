```
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var processChat = require('./process-chat');
var detectLang = require('./detect-lang');

module.exports = exports = function processChatAsync(text, callback) {
  return Q.fcall(function() {
      console.time("processChat");
      return processChat(text);
    })
    .then(function(result) {
      console.timeEnd("processChat");
      var plainText = result.plainText.trim();

      if(!plainText) return result;
      return detectLang(plainText)
        .then(function(lang) {
          result.lang = lang;
          return result;
        });
    })
    .nodeify(callback);
};
```
