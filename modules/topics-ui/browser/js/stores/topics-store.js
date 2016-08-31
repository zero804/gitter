import { Model, Collection } from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_TOPIC, TOPIC_CREATED} from '../../../shared/constants/create-topic';
import $ from 'jquery';
import parseTag from '../../../shared/parse/tag';

var TopicModel = Model.extend({
  defaults: {},
  url(){
    const forumId = this.collection.getForumId();
    return this.get('id') ? null : `/api/v1/forums/${forumId}/topics`;
  },

  sync(){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": this.collection.getAccessToken() }
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
  onError(){

  },

  toJSON() {
    var data = this.attributes;
    return Object.assign({}, data, {
      tags: data.tags.map(parseTag)
    });
  }


});

export default Collection.extend({

  model: TopicModel,

  initialize(models, attrs){
    this.accessTokenStore = attrs.accessTokenStore;
    this.forumStore = attrs.forumStore;
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
    const newTopic = this.create({ title: data.title, text: data.body });
    newTopic.on(TOPIC_CREATED, ()=> {
      this.trigger(TOPIC_CREATED, {
        topicId: newTopic.get('id'),
        slug: newTopic.get('slug')
      });
    })
  },

  //TODO Remove
  getAccessToken(){
    return this.accessTokenStore.get('accessToken');
  },

  getForumId(){
    return this.forumStore.get('id');
  },

  //TODO REMOVE
  getCategoryId(){
    //TODO This needs to be fleshed out when the UI is completed
    const categories = this.forumStore.get('categories');
    if(categories && categories[0]) { return categories[0].id; }
  }

});
