import Backbone from 'backbone';

const CurrentUserStore = Backbone.Model.extend({
  getCurrentUser(){ return this.toJSON(); }
});

let store;

const serverSideStore = (window.context.currentUserStore || {});
const serverSideData = (serverSideStore.data || {});

export function getCurrentUserStore(data){
  if(!store) { store = new CurrentUserStore(serverSideData); }
  if(data) { store.set(data); }
  return store;
}

export function getCurrentUser(){
  return getCurrentUserStore().getCurrentUser();
}
