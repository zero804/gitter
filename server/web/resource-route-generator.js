'use strict';

var express       = require('express');
var StatusError   = require('statuserror');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

module.exports = function resourceRoute(routeIdentifier, resource) {
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

  function mount(method, url, subrouteIdentifier, impl) {
    if (!impl) return;
    router[method](url,
      identifyRoute(routeIdentifier + '-' + subrouteIdentifier),
      impl);
  }

  mount('get',    '/',                       'index',   resource.index);
  mount('get',    '/new',                    'new',     resource.new);
  mount('post',   '/',                       'create',  resource.create);
  mount('get',    '/:' + idParam,            'get',     resource.get);
  mount('get',    '/:' + idParam + '/edit',  'edit',    resource.edit);
  mount('put',    '/:' + idParam,            'update',  resource.update);
  mount('delete', '/:' + idParam,            'destroy', resource.destroy);

  if (resource.subresources) {
    Object.keys(resource.subresources).forEach(function(subresourceName) {
      var subresource = resource.subresources[subresourceName];
      router.use('/:' + idParam + '/' + subresourceName, resourceRoute(routeIdentifier + '-' + subresourceName, subresource));
    });
  }

  return router;
};
