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
    ':groupName/topics/categories/:categoryName': 'forums'
  },

  forums(groupName, categoryName){
    categoryName = (categoryName || 'all');
    this.model.set({
      route: 'forum' ,
      groupName: groupName,
      categoryName: categoryName,
    });
  }

});

var router = new Router();

module.exports = router.model;
