var path = require('path');
var appWebpackConfig = require('../../public/js/webpack.config.js');

module.exports = {
  entry: path.resolve(__dirname, './fixtures/runner.js'),
  output: {
    path: path.resolve(__dirname, './fixtures/build'),
    filename: 'test.js',
    publicPath: '/fixtures/build/',
  },
  module: {
    loaders: appWebpackConfig.module.loaders,
  },
  resolve: {
    modulesDirectories: [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, '../../public/js'),
    ],
    alias: {
      jquery:  path.resolve(__dirname, '../../public/repo/jquery/jquery.js'),
      cocktail: path.resolve(__dirname, '../../public/repo/cocktail/cocktail.js'),
      'backbone-sorted-collection': path.resolve(__dirname, '../../public/repo/backbone-sorted-collection/backbone-sorted-collection.js'),
      'bootstrap_tooltip': path.resolve(__dirname, '../../public/js/utils/tooltip.js'),
    },
  },
};
