"use strict";

var path = require('path');

module.exports = function(plop){
  require('require-all')({//eslint-disable-line node/no-unpublished-require
    dirname: path.resolve(__dirname, './plop/generators'),
    filter: /-generator\.js$/,
    resolve: function(mod){
      mod(plop);
    }
  });
};
