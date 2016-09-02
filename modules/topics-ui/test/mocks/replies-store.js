import Backbone from 'backbone';
import data from './mock-data/replies';

var RepliesStore = Backbone.Collection.extend({
  getReplies(){
    return this.models.map((model) => model.toJSON());
  }
});

const store = new RepliesStore(data);

afterEach(() => store.reset(data));

export default store;
