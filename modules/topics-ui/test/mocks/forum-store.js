import Backbone from 'backbone';
import data from './mock-data/forum';

let store;
const ForumStore = Backbone.Model.extend({
  getForumId: ()=> data.id,
  getForumStore: () => store,
});

store = new ForumStore(data);

afterEach(() => store.set(data));

export default store;
