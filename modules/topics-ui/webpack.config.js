"use strict";

var path = require('path');
var packageInfo = require('./package.json');
var fs = require('fs');

var webpack = require('webpack');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

var config = {
  target: 'node',
  externals: nodeModules,
  entry: {
    ForumContainer: path.resolve(__dirname, './containers/ForumContainer'),
  },
  output: {
    path:     path.resolve(__dirname, './output'),
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
    new webpack.ProvidePlugin({
      React: 'react',
    })
  ]
};

module.exports = config;
