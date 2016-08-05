"use strict"
/*
FIXME
Consider changing this to be a store that can be passed around
This way derived states can be calculated in components rather than passing
Im thinking mainly of active states in the category buttons and active states in the table control
props way down from the parent
*/
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

    categoryName = (categoryName || 'all');
    queryString = (queryString || '');
    const query = qs.parse(queryString);

    this.model.set({
      route: 'forum' ,
      groupName: groupName,
      //These should have defaults and be pulled from havigation constants
      categoryName: categoryName,
      filterName: query.filter,
      tagName: query.tag,
      sortName: query.sort
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
