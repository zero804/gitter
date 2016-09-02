import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_TOPIC, TOPIC_CREATED} from '../../../shared/constants/create-topic';
import $ from 'jquery';
import parseTag from '../../../shared/parse/tag';
import {getRealtimeClient} from './realtime-client';
import LiveCollection from './live-collection';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {getAccessToken} from './access-token-store';
import {getForumId} from './forum-store';

var TopicModel = Backbone.Model.extend({
  defaults: {},
  url(){
    return this.get('id') ? null : `/api/v1/forums/${getForumId()}/topics`;
  },

  sync(){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": getAccessToken() }
    const catId = this.collection.getCategoryId();
    const data = JSON.stringify(Object.assign(this.toJSON(), {
      categoryId: catId,
    }));

    $.ajax({
      url: this.url(),
      contentType: 'application/json',
      type: 'POST',
      headers: headers,
      data: data,
      success: this.onSuccess.bind(this),
      error: this.onError.bind(this),
    })
  },

  onSuccess(attrs) {
    this.set(attrs);
    this.trigger(TOPIC_CREATED, this);
  },

  onError(){},

  toJSON() {
    var data = this.attributes;
    data.tags = (data.tags || []);
    return Object.assign({}, data, {
      tags: data.tags.map(parseTag)
    });
  }


});

export default dispatchOnChangeMixin(LiveCollection.extend({

  model: TopicModel,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics',
  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId()
    });
  },

  initialize(){
    subscribe(SUBMIT_NEW_TOPIC, this.creatNewTopic, this);
  },

  getTopics() {
    return this.models.map(model => model.toJSON());
  },

  getById(id){
    const model = this.get(id);
    if(!model){ return; }
    return model.toJSON();
  },

  creatNewTopic(data){
    const model = this.create({ title: data.title, text: data.body });
    model.once(TOPIC_CREATED, () => this.trigger(TOPIC_CREATED, {
      topicId: model.get('id'),
      slug: model.get('slug')
    }));
  },

  //TODO REMOVE
  getCategoryId(){
    //TODO This needs to be fleshed out when the UI is completed
    const categories = this.forumStore.get('categories');
    if(categories && categories[0]) { return categories[0].id; }
  }

}));
