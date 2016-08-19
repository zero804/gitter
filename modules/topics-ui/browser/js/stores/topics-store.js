import { Model, Collection } from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_TOPIC} from '../../../shared/constants/create-topic';

var TopicModel = Model.extend({
  defaults: {},
  url(){
    return !this.get('id') ? `/api/v1/forums/:forumId/topics` : '';
  },

  sync(){
    //Need to abstract and pull in the apiClient here so this is a bodge
    console.log('working');
  }

});

export default Collection.extend({

  model: TopicModel,

  initialize(){
    subscribe(SUBMIT_NEW_TOPIC, this.creatNewTopic, this);
  },

  getTopics() {
    return this.models.map(model => model.toJSON());
  },

  getById(id){
    return this.get(id).toJSON();
  },

  creatNewTopic(title, body){
    console.log('-----------------------');
    console.log(title, body);
    console.log('-----------------------');
    this.create({ title: title, body: body });
  }

});
