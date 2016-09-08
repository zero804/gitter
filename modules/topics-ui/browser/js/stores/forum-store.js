import Backbone from 'backbone';

const ForumStore = Backbone.Model.extend({
  getForum(){ return this.toJSON(); },
  getForumId() { return this.get('id'); }
});

let store;

const serverSideStore = (window.context.forumStore || {});
const serverSideData = (serverSideStore.data || {});

export function getForumStore(data){
  if(!store) { store = new ForumStore(serverSideData); }
  if(data) { store.set(data); }
  return store;
}

export function getForum(){
  return getForumStore().getForum();
}

export function getForumId(){
  return getForumStore().getForumId()
}
