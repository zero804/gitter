import Backbone from 'backbone';
import data from './mock-data/forum';

const ForumStore = Backbone.Model.extend({});
const store = new ForumStore(data);

afterEach(() => store.set(data));

export default store;
