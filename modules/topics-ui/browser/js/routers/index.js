"use strict"

var Backbone = require('backbone');
var _ = require('lodash');
var qs = require('qs');
var { subscribe }  = require('../dispatcher');
var navConstants = require('../constants/navigation');

var _super = Backbone.Router.prototype;

var RouteModel = Backbone.Model.extend({
  //Do we need to use the constructor to get the default values out of the window.context
  defaults: { route: null }
});

var Router = Backbone.Router.extend({

  constructor: function(){
    this.model = new RouteModel();
    subscribe(navConstants.NAVIGATE_TO, this.navigateTo, this);
    _super.constructor.call(this, ...arguments);
  },

  routes: {
    ':groupName/topics(/categories/:categoryName)(/)(?*queryString)': 'forums'
  },

  forums(groupName, categoryName, queryString){
    const query = qs.parse(queryString || '');
    this.model.set({
      route: 'forum' ,
      groupName: groupName,
      categoryName: (categoryName || navConstants.DEFAULT_CATEGORY_NAME),
      filterName: (query.filter || navConstants.DEFAULT_FILTER_NAME),
      tagName: (query.tag || navConstants.DEFAULT_TAG_NAME),
      sortName: (query.sort || navConstants.DEFAULT_SORT_NAME),
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
