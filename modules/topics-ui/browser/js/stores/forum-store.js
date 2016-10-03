import { BaseModel } from './base-model';
import {subscribe} from '../../../shared/dispatcher';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

import {
  UPDATE_FORUM_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  SUBSCRIPTION_STATE_PENDING
} from '../../../shared/constants/forum.js';

const ForumStore = BaseModel.extend({
  defaults: {
    subscriptionState: SUBSCRIPTION_STATE_UNSUBSCRIBED
  },

  events: [
    'change:id',
    'change:subscriptionState'
  ],

  initialize() {
    subscribe(REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, this.onRequestSubscriptionStateUpdate, this);
    subscribe(UPDATE_FORUM_SUBSCRIPTION_STATE, this.onSubscriptionStateUpdate, this);
  },

  onRequestSubscriptionStateUpdate() {
    this.set({
      subscriptionState: SUBSCRIPTION_STATE_PENDING
    });
  },

  onSubscriptionStateUpdate({state}) {
    this.set({
      subscriptionState: state
    });
  },

  getForum() {
    return this.toPOJO();
  },

  getForumId() {
    return this.get('id');
  },

  getSubscriptionState() {
    return this.get('subscriptionState');
  }
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

export function getSubscriptionState(){
  return getForumStore().getSubscriptionState()
}
