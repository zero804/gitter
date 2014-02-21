/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var request = require('request');
var fetchAllPages = require('./fetch-all-pages');
var logFailingRequest = require('./log-failing-request');
var requestWithRetry = require('./request-with-retry');

module.exports = fetchAllPages(logFailingRequest(requestWithRetry({ maxRetries: 3 }, request)));