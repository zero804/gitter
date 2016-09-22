import Backbone from 'backbone';
import _ from 'lodash';
import {subscribe} from '../../../shared/dispatcher';
import SimpleFilteredCollection from 'gitter-realtime-client/lib/simple-filtered-collection';

import LiveCollection from './live-collection';
import {BaseModel} from './base-model';

import parseTag from '../../../shared/parse/tag';
import {getRealtimeClient} from './realtime-client';
import {getForumId } from './forum-store';
import router from '../routers';
import {getCurrentUser} from '../stores/current-user-store';

import dispatchOnChangeMixin from './mixins/dispatch-on-change';

import {SUBMIT_NEW_TOPIC, TOPIC_CREATED} from '../../../shared/constants/create-topic';
import {DEFAULT_CATEGORY_NAME, DEFAULT_TAG_NAME} from '../../../shared/constants/navigation';
import {FILTER_BY_TOPIC} from '../../../shared/constants/forum-filters';
import {MOST_WATCHERS_SORT} from '../../../shared/constants/forum-sorts';
import { UPDATE_TOPIC_SUBSCRIPTION_STATE, REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, SUBSCRIPTION_STATE } from '../../../shared/constants/forum.js';

export const TopicModel = BaseModel.extend({
  url(){
    return this.get('id') ? null : `/api/v1/forums/${getForumId()}/topics`;
  },

  toJSON() {
    var data = this.attributes;
    data.tags = (data.tags || []);
    return Object.assign({}, data, {
      tags: data.tags.map(parseTag)
    });
  },

  getDataToSave(){
    const data = this.toJSON();
    const tags = (data.tags || []);
    const parsedTags = tags.map((t) => t.label);

    return Object.assign({}, data, {
      tags: parsedTags
    });
  }

});

export const TopicsLiveCollection = LiveCollection.extend({

  model: TopicModel,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics',

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId()
    });
  },

  initialize(){
    subscribe(SUBMIT_NEW_TOPIC, this.createNewTopic, this);
  },

  createNewTopic(data){

    const model = this.create({
      title: data.title,
      text: data.body,
      categoryId: data.categoryId,
      tags: data.tags
    }, { wait: true });

    model.once('add', () => {
      this.trigger(TOPIC_CREATED, {
        topicId: model.get('id'),
        slug: model.get('slug')
      });
    });
  },

});

export class TopicsStore {

  constructor(models, options) {
    _.extend(this, Backbone.Events);

    this.topicCollection = new TopicsLiveCollection(models, options);

    this.collection = new SimpleFilteredCollection([], {
      collection: this.topicCollection,
      filter: this.getFilter(),
      comparator: (a, b) => {
        const sort = router.get('sortName');
        if(sort === MOST_WATCHERS_SORT) {
          return (b.get('replyingUsers').length - a.get('replyingUsers').length);
        }
        return new Date(b.get('sent')) - new Date(a.get('sent')) ;
      }
    });

    this.listenTo(router, 'change:categoryName change:tagName change:filterName', this.onRouterUpdate, this);
    this.listenTo(router, 'change:sortName', this.onSortUpdate, this);

    //Proxy events from the filtered collection
    this.listenTo(this.collection, 'all', (type, collection ,val) => {
      this.trigger(type, collection, val);
    });

    this.listenTo(this.topicCollection, TOPIC_CREATED, (topicId, slug) => {
      this.collection.setFilter(this.getFilter());
      this.trigger(TOPIC_CREATED, topicId, slug);
    });

    subscribe(REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onRequestSubscriptionStateUpdate, this);
    subscribe(UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onSubscriptionStateUpdate, this);
  }

  getFilter() {
    const categorySlug = (router.get('categoryName') || DEFAULT_CATEGORY_NAME);
    const tagName = (router.get('tagName') || DEFAULT_TAG_NAME);
    const currentUser = getCurrentUser();
    const filterName = router.get('filterName');

    return function(model){

      //filter by category
      const category = (model.get('category') || {});
      let categoryResult = false;
      if(categorySlug === DEFAULT_CATEGORY_NAME) { categoryResult = true; }
      if(category.slug === categorySlug) { categoryResult = true; }

      if(categoryResult === false) { return false; }

      const tags = (model.get('tags') || []);
      let tagResult = false;
      if(tagName === DEFAULT_TAG_NAME) { tagResult = true; }
      else { tagResult = tags.some((t) => t === tagName); }

      if(tagResult === false) { return false; }

      if(filterName === FILTER_BY_TOPIC && model.get('user').username !== currentUser.username) {
        return false;
      }

      return true;

    }
  }

  getTopics() {
    return this.collection.toJSON();
  }

  getById(id) {
    const model = this.collection.get(id);
    if(!model) { return; }
    return model.toJSON();
  }

  onRouterUpdate() {
    this.collection.setFilter(this.getFilter());
  }

  onSortUpdate(){
    this.collection.sort();
  }

  onRequestSubscriptionStateUpdate(data) {
    var {topicId} = data;
    this.collection.get(topicId).set({
      subscriptionState: SUBSCRIPTION_STATE.PENDING
    });
  }

  onSubscriptionStateUpdate(data) {
    var {topicId, state} = data;
    this.collection.get(topicId).set({
      subscriptionState: state
    });
  }
}



dispatchOnChangeMixin(TopicsStore, [
  'sort',
  //'change:id', //TODO: uncomment
  'change:subscriptionState'
]);

const serverStore = (window.context.topicsStore || {});
const serverData = (serverStore.data || []);
let store;
export function getTopicsStore(data){
  if(!store) { store = new TopicsStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
