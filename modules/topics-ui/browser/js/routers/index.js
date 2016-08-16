"use strict"

var Backbone = require('backbone');
var { subscribe } = require('../dispatcher');
var navConstants = require('../constants/navigation');

var _super = Backbone.Router.prototype;

var RouteModel = Backbone.Model.extend({
  defaults: { route: null }
});

var Router = Backbone.Router.extend({

  constructor: function(){
    this.model = new RouteModel();
    subscribe(navConstants.NAVIGATE_TO, this.navigateTo, this);
    _super.constructor.call(this, ...arguments);
  },

  routes: {
    ':groupName/topics(/)': 'forums',
    ':groupName/topics/categories/:categoryName(/)': 'forums'
  },

  forums(groupName, categoryName){
    categoryName = (categoryName || 'all');
    this.model.set({
      route: 'forum' ,
      groupName: groupName,
      categoryName: categoryName,
    });
  },

  navigateTo(data){
    switch(data.route) {
      case 'forum': return this.navigateToForum(data);
    }
  },

  navigateToForum(data = { category: 'all' }){

    const { category } = data;

    var url = (data.category === 'all') ?
      `/${this.model.get('groupName')}/topics` :
      `/${this.model.get('groupName')}/topics/categories/${category}`;

    this.navigate(url, { trigger: true, replace: true });
  }

});

var router = new Router();

module.exports = router.model;
