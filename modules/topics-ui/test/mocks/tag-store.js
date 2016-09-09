import Backbone from 'backbone';
import data from './mock-data/tags';

var CategoryStore = Backbone.Collection.extend({
  getTags: function(){
    return this.models.map(function(model){ return model.toJSON(); });
  },
  pluckValues: () => ['', ''],
  getTagsByValue: () => [],
});

var store = new CategoryStore(data);

afterEach(function(){
  store.reset(data);
});

export default store;
