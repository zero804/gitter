import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import { TOGGLE_FORUM_WATCH_STATE } from '../../../shared/constants/forum.js';

const ForumStore = Backbone.Model.extend({
  events: [
    'change:id',
    'change:isWatching'
  ],

  initialize: function() {
    subscribe(TOGGLE_FORUM_WATCH_STATE, this.onWatchStateUpdate, this);
  },

  onWatchStateUpdate: function(data) {
    var {desiredState} = data;

    // Toggle if no state was provided
    var newState = (desiredState !== undefined) ? desiredState : !this.get('isWatching');
    this.set({
      isWatching: newState
    });
  },

  getForum(){ return this.toJSON(); },
  getForumId() { return this.get('id'); },
  getIsWatching() { return this.get('isWatching'); }
});

dispatchOnChangeMixin(ForumStore);

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

export function getIsWatching(){
  return getForumStore().getIsWatching()
}
