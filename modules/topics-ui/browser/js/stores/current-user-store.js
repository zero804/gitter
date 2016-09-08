import Backbone from 'backbone';

const CurrentUserStore = Backbone.Model.extend({
  getCurrentUser(){ return this.toJSON(); }
});


const serverStore = (window.context.currentUserStore || {});
const serverData = (serverStore.data || {});
let store;
export function getCurrentUserStore(data){
  if(!store) { store = new CurrentUserStore(serverData); }
  if(data) { store.set(data); }
  return store;
}

export function getCurrentUser(){
  return getCurrentUserStore().getCurrentUser();
}
