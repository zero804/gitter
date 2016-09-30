import Backbone from 'backbone';
import data from './mock-data/topics';

var CategoryStore = Backbone.Collection.extend({
  getTopics: function(){
    return this.models.map(function(model){ return model.toJSON(); });
  },
  getById: function(id){
    return this.get(id).toJSON();
  },
  getDraftTopic: function() {
    return {
      title: '',
      text: '',
      categoryId: '',
      tags: [],
    };
  }
});

var store = new CategoryStore(data);

afterEach(function(){
  store.reset(data);
});

export default store;
