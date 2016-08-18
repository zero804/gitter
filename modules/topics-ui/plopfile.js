"use strict";

var path = require('path');

module.exports = function(plop){
  require('require-all')({
    dirname: path.resolve(__dirname, './plop/generators'),
    filter: /-generator\.js$/,
    resolve: function(mod){
      mod(plop);
    }
  });
};
