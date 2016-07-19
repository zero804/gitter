"use strict";

/*
 This config is likely to change and be broken into
 - server
 - client

  managed by a gulp build
  its good enough for now however to have everything in one file
*/

var path = require('path');
var packageInfo = require('./package.json');
var fs = require('fs');

var webpack = require('webpack');

//We need to stop webpack building and .bin files
//as this will absolutely destroy the prod servers
//http://jlongster.com/Backend-Apps-with-Webpack--Part-I
var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

var config = {
  //Leave node deps alone
  target: 'node',
  //Ignore any .bin files
  externals: nodeModules,
  entry: {
    ForumContainer: path.resolve(__dirname, './containers/ForumContainer'),
  },
  output: {
    path:     path.resolve(__dirname, './output'),
    //module.exports = myExport
    libraryTarget: 'commonjs2',
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx$/,
        loader: 'babel',
        exclude: /\/node_modules\//,
        query: packageInfo.babel,
      }
    ]
  },
  resolve: {
    extensions: [ '', '.js', '.jsx' ]
  },
  plugins: [
    //For all those GLOBAL jsx assumptions
    new webpack.ProvidePlugin({
      React: 'react',
    })
  ]
};

module.exports = config;
