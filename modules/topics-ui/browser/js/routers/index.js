"use strict"

var Backbone = require('backbone');
var qs = require('qs');
var { subscribe } = require('../dispatcher');

var navConstants = require('../constants/navigation');
var forumCatConstants = require('../constants/forum-categories');
var forumFilterConstants = require('../constants/forum-filters');
var forumTagConstants = require('../constants/forum-tags');
var forumSortConstants = require('../constants/forum-sorts');

var _super = Backbone.Router.prototype;

var RouteModel = Backbone.Model.extend({
  //Do we need to use the constructor to get the default values out of the window.context
  defaults: { route: null }
});

var Router = Backbone.Router.extend({

  constructor: function(){
    this.model = new RouteModel();
    subscribe(forumCatConstants.NAVIGATE_TO_CATEGORY, this.updateForumCategory, this);
    subscribe(forumFilterConstants.NAVIGATE_TO_FILTER, this.updateForumFilter, this);
    subscribe(forumTagConstants.NAVIGATE_TO_TAG, this.updateForumTag, this);
    subscribe(forumSortConstants.NAVIGATE_TO_SORT, this.updateForumSort, this);

    this.listenTo(this.model, 'change:filterName', this.onFilterUpdate, this);
    this.listenTo(this.model, 'change:sortName', this.onSortUpdate, this);

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

  updateForumCategory(data){
    var url = this.buildForumUrl(data.category);
    this.navigate(url, { trigger: true, replace: true });
  },

  updateForumFilter(data) {
    var url = this.buildForumUrl(undefined, data.filter);
    this.navigate(url, { trigger: true, replace: true });
  },

  updateForumTag(data){
    var url = this.buildForumUrl(undefined, undefined, data.tag);
    this.navigate(url, { trigger: true, replace: true });
  },

  updateForumSort(data){
    var url = this.buildForumUrl(undefined, undefined, undefined, data.sort);
    this.navigate(url, { trigger: true, replace: true });
  },

  onFilterUpdate(){
    this.model.trigger(forumFilterConstants.UPDATE_ACTIVE_FILTER);
  },

  onSortUpdate(){
    this.model.trigger(forumSortConstants.UPDATE_ACTIVE_SORT);
  },

  buildForumUrl(categoryName, filterName, tagName, sortName){

    var groupName = this.model.get('groupName');
    categoryName = categoryName || this.model.get('categoryName');

    //Get current values and cancel anything that is a default
    filterName = (filterName || this.model.get('filterName'));
    if(filterName === navConstants.DEFAULT_FILTER_NAME) { filterName = undefined; }

    tagName = (tagName || this.model.get('tagName'));
    if(tagName === navConstants.DEFAULT_TAG_NAME) { tagName = undefined; }

    sortName = (sortName || this.model.get('sortName'));
    if(sortName === navConstants.DEFAULT_SORT_NAME) { sortName = undefined; }

    //Base URL
    let url = (categoryName === navConstants.DEFULT_CATEGORY_NAME) ?
      `/${groupName}/topics/` :
      `${groupName}/topics/categories/${categoryName}/`;

    //QUERY STRING
    const query = qs.stringify({
      filter: filterName,
      tag: tagName,
      sort: sortName,
    });

    if(query.length) { url = `${url}?${query}`; }

    return url;

  },

});

var router = new Router();

module.exports = router.model;
