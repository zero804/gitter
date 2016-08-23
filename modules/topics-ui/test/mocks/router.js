"use strict";

var Backbone = require('backbone');
var routeData = require('./mock-data/route');

var MockRouter = Backbone.Model.extend({});

var router = new MockRouter(routeData);

afterEach(function(){
  router.set(routeData)
})

module.exports = router;
