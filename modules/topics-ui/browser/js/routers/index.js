
import { parse, stringify } from 'qs';
import Backbone from 'backbone';
import { subscribe } from '../../../shared/dispatcher';
import * as navConstants from '../../../shared/constants/navigation';
import * as forumCatConstants from '../../../shared/constants/forum-categories';
import * as forumFilterConstants from '../../../shared/constants/forum-filters';
import * as forumTagConstants from '../../../shared/constants/forum-tags';
import * as forumSortConstants from '../../../shared/constants/forum-sorts';

var RouteModel = Backbone.Model.extend({
  //Do we need to use the constructor to get the default values out of the window.context
  defaults: {
    route: null,
    createTopic: false
  }
});

var Router = Backbone.Router.extend({

  constructor: function() {
    this.model = new RouteModel();

    subscribe(forumCatConstants.NAVIGATE_TO_CATEGORY, this.updateForumCategory, this);
    subscribe(forumFilterConstants.NAVIGATE_TO_FILTER, this.updateForumFilter, this);
    subscribe(forumTagConstants.NAVIGATE_TO_TAG, this.updateForumTag, this);
    subscribe(forumSortConstants.NAVIGATE_TO_SORT, this.updateForumSort, this);

    this.listenTo(this.model, 'change:filterName', this.onFilterUpdate, this);
    this.listenTo(this.model, 'change:sortName', this.onSortUpdate, this);

    Backbone.Router.prototype.constructor.call(this, ...arguments);
  },

  routes: {
    ':groupName/topics/create-topic(/)': 'createTopic',
    ':groupName/topics(/categories/:categoryName)(/)(?*queryString)': 'forums'
  },

  createTopic(groupName){
    this.model.set({
      route: 'create-topic',
      groupName: groupName,
      categoryName: navConstants.DEFAULT_CATEGORY_NAME,
      createTopic: true,
    });
  },

  forums(groupName, categoryName, queryString){
    const query = parse(queryString || '');
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

  onFilterUpdate(moidel, val){
    this.model.trigger(forumFilterConstants.UPDATE_ACTIVE_FILTER, { filter: val });
  },

  onSortUpdate(model, val){
    this.model.trigger(forumSortConstants.UPDATE_ACTIVE_SORT, { sort: val });
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
    let url = (categoryName === navConstants.DEFAULT_CATEGORY_NAME) ?
      `/${groupName}/topics/` :
      `${groupName}/topics/categories/${categoryName}/`;

    //QUERY STRING
    const query = stringify({
      filter: filterName,
      tag: tagName,
      sort: sortName,
    });

    if(query.length) { url = `${url}?${query}`; }

    return url;

  },

});

var router = new Router();

export default router.model;
