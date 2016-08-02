"use strict"

var Backbone = require('backbone');
var qs = require('gitter-web-qs');
var _ = require('lodash');

var _super = Backbone.Router.prototype;

var RouteModel = Backbone.Model.extend({
  defaults: { route: null }
});

var Router = Backbone.Router.extend({

  constructor: function(){
    this.model = new RouteModel();
    _super.constructor.call(this, ...arguments);
  },

  routes: {
    ':groupName/topics': 'forums',
    ':groupName/topics?*query': 'forums'
  },

  forums(groupName, query){
    console.log(query);

    var payload = {
      route: 'forum' ,
      groupName: groupName,
      filter: 'all'
    };

    if(query) { payload = _.extend(payload, qs); }

    console.log('-----------------------');
    console.log(payload, query);
    console.log('-----------------------');
    this.model.set(payload);
  }

});

var router = new Router();

module.exports = router.model;
