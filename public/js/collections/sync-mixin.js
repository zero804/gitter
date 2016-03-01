'use strict';

var _         = require('underscore');
var Backbone  = require('backbone');
var apiClient = require('components/apiClient');

var methodMap = {
  'create': 'post',
  'update': 'put',
  'patch':  'patch',
  'delete': 'delete',
  'read':   'get'
};

module.exports = {
  sync: function(method, model, options) {

    var url = options.url || _.result(model, 'url');
    if(!url) throw new Error('URL required');

    var m = methodMap[method];

    var promise;
    if(m === 'get') {
      promise = apiClient[m](url, options.data);
    } else {
      promise = apiClient[m](url, model);
    }

    if(options.success) {
      promise = promise.then(options.success);
    }

    if(options.error) {
      promise = promise.catch(options.error); // Backbone will trigger the 'error' event
    }

    model.trigger('request', model, null, options);
    return promise;
  }
};
