"use strict";

var env           = require('../utils/env');
var logger        = env.logger;
var config        = env.config;
var elasticsearch = require('elasticsearch');

function ElasticSearchLoggingAdapter(/*config*/) {
}

ElasticSearchLoggingAdapter.prototype.error = function(error) {
  logger.error('es: error ' + error, { exception: error });
};

ElasticSearchLoggingAdapter.prototype.warning = function(message) {
  logger.warn('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.info = function(message) {
  logger.info('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.debug = function(message) {
  logger.verbose('es: ' + message);
};

ElasticSearchLoggingAdapter.prototype.trace = function (method, requestUrl, body, responseBody, responseStatus) {
  logger.silly('es: trace', {
    method: method,
    requestUrl: requestUrl,
    body: body,
    responseBody: responseBody,
    responseStatus: responseStatus
  });
};
ElasticSearchLoggingAdapter.prototype.close = function () { };

var client = new elasticsearch.Client({
  hosts: config.get('elasticsearch:hosts'),
  sniffOnStart: true,
  sniffInterval: 60000,
  log: ElasticSearchLoggingAdapter
});

module.exports = exports = client;
