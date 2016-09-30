import Backbone from 'backbone';
import data from './mock-data/group';

let store;
const GroupStore = Backbone.Model.extend({
  getGroupStore: () => store,
  getGroupId: ()=> data.id,
  getGroupUri: ()=> data.uri,
  getGroupName: ()=> data.name
});

store = new GroupStore(data);

afterEach(() => store.set(data));

export default store;
