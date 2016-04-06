'use strict';

var _         = require('underscore');
var apiClient = require('components/apiClient');

var methodMap = {
  'create': 'post',
  'update': 'put',
  'patch':  'patch',
  'delete': 'delete',
  'read':   'get'
};

function performAction(m, url, model, options) {
  switch(m) {
    case 'get':
      return apiClient.get(url, options.data);

    case 'patch':
      if (options.attrs) {
        return apiClient.patch(url, options.attrs);
      } else {
        return apiClient.patch(url, model);
      }
      break;

    default:
      return apiClient[m](url, model);
  }
}
module.exports = {
  sync: function(method, model, options) {

    var url = options.url || _.result(model, 'url');
    if(!url) throw new Error('URL required');

    var m = methodMap[method];

    var promise = performAction(m, url, model, options);

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
