import Backbone from 'backbone';
import data from './mock-data/current-user';

const CurrentUserStore = Backbone.Model.extend({});

const store = new CurrentUserStore(data);

afterEach(() => store.set(data));

export default store;
