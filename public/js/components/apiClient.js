define([
  'jquery'
], function($) {
  "use strict";

  /* @const */
  var DEFAULT_TIMEOUT = 15 * 1000;

  // TODO return a proper promise instead of a $.Deferred
  function operation(method, url, data, options) {
    if(!options) options = {};

    var dataSerialized = JSON.stringify(data);

    return $.ajax({
      url: url,
      contentType: "application/json",
      dataType: "json",
      type: method,
      global: options.global === undefined ? true : options.global,
      data: dataSerialized,
      context: options.context,
      timeout: options.timeout || DEFAULT_TIMEOUT
    });
  }

  return ['get', 'post', 'patch', 'put'].reduce(function(memo, method) {
    memo[method] = operation.bind(memo, method);
    return memo;
  }, {});

});
