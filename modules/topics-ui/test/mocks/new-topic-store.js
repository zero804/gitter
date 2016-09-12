import Backbone from 'backbone';
import data from './mock-data/new-topic';

var NewTopicStore = Backbone.Model.extend({
  getNewTopic: () => data
});

var store = new NewTopicStore(data);

afterEach(function(){
  store.set(data);
});

export default store;
