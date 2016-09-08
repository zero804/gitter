import Backbone from 'backbone';
import _ from 'lodash';
import {subscribe} from '../../../shared/dispatcher';
import SimpleFilteredCollection from 'gitter-realtime-client/lib/simple-filtered-collection';

import LiveCollection from './live-collection';
import {BaseModel} from './base-model';

import parseTag from '../../../shared/parse/tag';
import {getRealtimeClient} from './realtime-client';
import {getForumId, getForumStore} from './forum-store';
import router from '../routers';

import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {SUBMIT_NEW_TOPIC, TOPIC_CREATED} from '../../../shared/constants/create-topic';

export const TopicModel = BaseModel.extend({
  url(){
    return this.get('id') ? null : `/api/v1/forums/${getForumId()}/topics`;
  },

  toJSON() {
    var data = this.attributes;
    data.tags = (data.tags || []);
    return Object.assign({}, data, {
      tags: data.tags.map(parseTag),
      categoryId: this.collection.getCategoryId(),
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
    const model = this.create({ title: data.title, text: data.body }, { wait: true });
    model.once('add', () => {
      this.trigger(TOPIC_CREATED, {
        topicId: model.get('id'),
        slug: model.get('slug')
      });
    });
  },

});

export class TopicsStore {

  constructor(models, options){
    _.extend(this, Backbone.Events);

    this.topicCollection = new TopicsLiveCollection(models, options);
    this.collection = new SimpleFilteredCollection([], Object.assign({}, options, {
      collection: this.topicCollection,
      filter: this.filterFn,
    }));
    this.listenTo(router, 'change:categoryName', this.onRouterUpdate, this);
  }

  filterFn(model){
    const categoryName = router.get('categoryName');
    const category = model.get('category');
    return true
    //return category.slug === categoryName;
  }

  getTopics(){
    return this.collection.models.map((m) => m.toJSON());
  }

  getById(id){
    const model = this.collection.get(id);
    if(!model) { return; }
    return model.toJSON();
  }

  onRouterUpdate(){
    this.collection.setFilter(this.filterFn);
  }
}



dispatchOnChangeMixin(TopicsStore);

const serverStore = (window.context.topicsStore || {});
const serverData = (serverStore.data || []);
let store;
export function getTopicsStore(data){
  if(!store) { store = new TopicsStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
