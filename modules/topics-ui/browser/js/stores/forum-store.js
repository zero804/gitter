import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import { UPDATE_FORUM_WATCH_STATE, ATTEMPT_UPDATE_FORUM_WATCH_STATE, FORUM_WATCH_STATE } from '../../../shared/constants/forum.js';

const ForumStore = Backbone.Model.extend({
  defaults: {
    watchState: FORUM_WATCH_STATE.NOT_WATCHING
  },

  events: [
    'change:id',
    'change:watchState'
  ],

  initialize: function() {
    subscribe(ATTEMPT_UPDATE_FORUM_WATCH_STATE, this.onAttemptWatchStateUpdate, this);
    subscribe(UPDATE_FORUM_WATCH_STATE, this.onWatchStateUpdate, this);
  },

  onAttemptWatchStateUpdate: function() {
    this.set({
      watchState: FORUM_WATCH_STATE.PENDING
    });
  },

  onWatchStateUpdate: function(data) {
    var {state} = data;

    this.set({
      watchState: state
    });
  },

  getForum(){ return this.toJSON(); },
  getForumId() { return this.get('id'); },
  getWatchState() { return this.get('watchState'); }
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

export function getWatchState(){
  return getForumStore().getWatchState()
}
