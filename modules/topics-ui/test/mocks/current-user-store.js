import Backbone from 'backbone';
import data from './mock-data/current-user';

const CurrentUserStore = Backbone.Model.extend({
  getCurrentUser() {
    return data;
  },
  getIsSignedIn() {
    return !!data.id;
  }
});

const store = new CurrentUserStore(data);

afterEach(() => store.set(data));

export default store;
