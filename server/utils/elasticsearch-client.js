"use strict";

var env           = require('gitter-web-env');
var logger        = env.logger;
var config        = env.config;
var elasticsearch = require('elasticsearch');
var debug         = require('debug')('gitter:elasticsearch');

function ElasticSearchLoggingAdapter(/*config*/) {
}

ElasticSearchLoggingAdapter.prototype.error = function(error) {
  logger.error('es: error ' + error, { exception: error });
};

ElasticSearchLoggingAdapter.prototype.warning = function(message) {
  logger.warn('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.info = function(message) {
  debug('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.debug = function(message) {
  debug(message);
};

ElasticSearchLoggingAdapter.prototype.trace = function (method, requestUrl, body/*, responseBody, responseStatus*/) {
  debug("trace: method=%s url=%s, body=%j", method, requestUrl && requestUrl.path, body);
};
ElasticSearchLoggingAdapter.prototype.close = function () { };

var client = new elasticsearch.Client({
  hosts: config.get('elasticsearch:hosts'),
  // Warning: possible memory leak: https://github.com/elasticsearch/elasticsearch-js/issues/71
  sniffOnStart: config.get('elasticsearch:sniffOnStart'),
  sniffInterval: 300000,
  log: ElasticSearchLoggingAdapter
});

module.exports = exports = client;
