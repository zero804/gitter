import Backbone from 'backbone';
import parseReply from '../../../shared/parse/reply';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_REPLY} from '../../../shared/constants/create-reply';
import LiveCollection from './live-collection';
import {getRealtimeClient} from './realtime-client';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {getCurrentUser} from './current-user-store';
import {getForumId} from './forum-store'
import router from '../routers';
import {BaseModel} from './base-model';
import {NAVIGATE_TO_TOPIC} from '../../../shared/constants/navigation';
import { UPDATE_REPLY_SUBSCRIPTION_STATE, REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, SUBSCRIPTION_STATE_PENDING } from '../../../shared/constants/forum.js';

export const ReplyModel = BaseModel.extend({
  url(){
    return this.get('id') ?
    null :
    `/api/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies`;
  },
});

export const RepliesStore = LiveCollection.extend({

  model: ReplyModel,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/replies',

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId(),
      topicId: router.get('topicId'),
    });
  },

  initialize(){
    subscribe(SUBMIT_NEW_REPLY, this.createNewReply, this);
    subscribe(NAVIGATE_TO_TOPIC, this.onNavigateToTopic, this);
    subscribe(REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, this.onRequestSubscriptionStateUpdate, this);
    subscribe(UPDATE_REPLY_SUBSCRIPTION_STATE, this.onSubscriptionStateUpdate, this);
    router.on('change:topicId', this.onActiveTopicUpdate, this);
  },

  getById(id) {
    const model = this.get(id);
    if(!model) { return; }
    return parseReply(model.toJSON());
  },

  getReplies(){
    return this.models.map(model => {
      return parseReply(model.toJSON());
    });
  },

  createNewReply(data){
    this.create({
      text: data.body,
      user: getCurrentUser(),
    });
  },

  onActiveTopicUpdate(router, topicId){
    this.contextModel.set('topicId', topicId);
  },

  onNavigateToTopic(){
    this.reset([]);
  },

  onRequestSubscriptionStateUpdate(data) {
    var {replyId} = data;
    var reply = this.get(replyId);
    if(!reply) { return; }

    reply.set({
      subscriptionState: SUBSCRIPTION_STATE_PENDING
    });
  },

  onSubscriptionStateUpdate(data) {
    var {replyId, state} = data;
    var reply = this.get(replyId);
    if(!reply) { return; }

    reply.set({
      subscriptionState: state
    });
  }

});

dispatchOnChangeMixin(RepliesStore, [
  'change:subscriptionState'
]);

const serverStore = (window.context.repliesStore|| {});
const serverData = (serverStore.data || [])
let store;

export function getRepliesStore(data){
  if(!store){ store = new RepliesStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
