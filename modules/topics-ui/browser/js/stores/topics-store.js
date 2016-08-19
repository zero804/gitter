import { Model, Collection } from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_TOPIC} from '../../../shared/constants/create-topic';
import $ from 'jquery';

var TopicModel = Model.extend({
  defaults: {},
  url(){
    return !this.get('id') ? `/api/v1/forums/:forumId/topics` : '';
  },

  sync(){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": this.collection.getAccessToken() }
    const data = JSON.stringify(this.toJSON());

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

  onSuccess(){
    console.log('success');
    debugger;
  },

  onError(){
    console.log('Errorzzzz');
    debugger;
  }

});

export default Collection.extend({

  model: TopicModel,

  initialize(models, attrs){
    this.accessTokenStore = attrs.accessTokenStore;
    subscribe(SUBMIT_NEW_TOPIC, this.creatNewTopic, this);
  },

  getTopics() {
    return this.models.map(model => model.toJSON());
  },

  getById(id){
    return this.get(id).toJSON();
  },

  creatNewTopic(data){
    this.create({ title: data.title, text: data.body });
  },

  //TODO Remove
  getAccessToken(){
    return this.accessTokenStore.get('accessToken');
  }

});
