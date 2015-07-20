'use strict';

var express = require('express');
var StatusError = require('statuserror');

module.exports = function resourceRoute(resource) {
  var router = express.Router({ caseSensitive: true, mergeParams: true });
  var idParam = resource.id;

  if (resource.load) {
    router.param(idParam, function(req, res, next, id) {
      resource.load(req, id, function(err, value) {
        if (err) return next(err);
        if (value === null) {
          return next(new StatusError(404));
        }

        req[idParam] = value;
        next();
      });
    });
  }

  function mount(method, url, impl) {
    if (!impl) return;
    router[method](url, impl);
  }

  mount('get',    '/',                       resource.index);
  mount('get',    '/new',                    resource.new);
  mount('post',   '/',                       resource.create);
  mount('get',    '/:' + idParam,            resource.get);
  mount('get',    '/:' + idParam + '/edit',  resource.edit);
  mount('put',    '/:' + idParam,            resource.update);
  mount('delete', '/:' + idParam,            resource.destroy);

  if (resource.subresources) {
    Object.keys(resource.subresources).forEach(function(subresourceName) {
      var subresource = resource.subresources[subresourceName];
      router.use('/:' + idParam + '/' + subresourceName, resourceRoute(subresource));
    });
  }

  return router;
};
