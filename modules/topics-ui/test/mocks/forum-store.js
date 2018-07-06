import Backbone from 'backbone';
import data from './mock-data/forum';

let store;
const ForumStore = Backbone.Model.extend({
  getForum: () => data,
  getForumId: () => data.id,
  getForumStore: () => store,
  getSubscriptionState: () => data.subscriptionState,
  getForumIsAdmin: () => data.permissions && data.permissions.admin,
});

store = new ForumStore(data);

afterEach(() => store.set(data));

export default store;
