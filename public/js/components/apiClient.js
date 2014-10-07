define([
  'jquery',
  'utils/context'
], function($, context) {
  "use strict";

  /* @const */
  var DEFAULT_TIMEOUT = 15 * 1000;

  /* @const */
  var JSON_MIME_TYPE = "application/json";

  /* @const */
  var GET_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json"
  };

  /* @const */
  var POST_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json",
    contentType: JSON_MIME_TYPE,
  };

  /* @const */
  var OPERATIONS = [
      ['get', GET_DEFAULTS],
      ['post', POST_DEFAULTS],
      ['patch', POST_DEFAULTS],
      ['put', POST_DEFAULTS],
      ['delete', POST_DEFAULTS]
    ];

  // If future this should direct clients to api.gitter.im
  function makeFullUrl(baseUrlFunction, url) {
    // XXX: we need to remove /api/ from all calls to apiClient
    if(!baseUrlFunction) {
      // Deprecated functionality
      if(url.indexOf('/api') === 0) return url;
      return '/api' + url;
    }

    return '/api' + baseUrlFunction() + url;
  }

  // TODO return a proper promise instead of a $.Deferred
  function operation(baseUrlFunction, method, defaultOptions, url, data, options) {
    options = defaults(options, defaultOptions);

    var dataSerialized;
    if(options.contentType === JSON_MIME_TYPE) {
      dataSerialized = JSON.stringify(data);
    } else {
      // JQuery will serialize to form data for us
      dataSerialized = data;
    }

    return $.ajax({
      url: makeFullUrl(baseUrlFunction, url),
      contentType: options.contentType,
      dataType: options.dataType,
      type: method,
      global: options.global,
      data: dataSerialized,
      context: options.context, // NB: deprecated: cant use with real promises
      timeout: options.timeout,
      async: options.async
    });
  }

  // Util functions
  function defaults(options, defaultValues) {
    if(!options) options = {};
    Object.keys(defaultValues).forEach(function(key) {
      if(options[key] === undefined) {
        // Only using a shallow clone for simplicity
        options[key] = defaultValues[key];
      }
    });
    return options;
  }

  function getClient(baseUrl) {
    return OPERATIONS
      .reduce(function(memo, descriptor) {
        var method = descriptor[0];
        var defaultOptions = descriptor[1];

        memo[method] = operation.bind(memo, baseUrl, method, defaultOptions);
        return memo;
      }, {});
  }

  return defaults(getClient(), {
    user: getClient(function() {
      return '/v1/user/' + context.getUserId();
    }),
    userRoom: getClient(function() {
      return '/v1/user/' + context.getUserId() + '/rooms/' + context.getTroupeId();
    }),
    priv: getClient(function() {
      return '/private';
    })
  });

});
