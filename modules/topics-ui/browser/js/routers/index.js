"use strict"

var Backbone = require('backbone');

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
    ':groupName/topics': 'forums'
  },

  forums(groupName){
    this.model.set({
      route: 'forum',
      groupName: groupName,
    });
  }

});

var router = new Router();

module.exports = router.model;
