import Backbone from 'backbone';
import LiveCollection from './live-collection';
import {BaseModel} from './base-model';
import {subscribe} from '../../../shared/dispatcher';

import router from '../routers';
import {getCurrentUser} from './current-user-store';
import {getForumId} from './forum-store'
import {getRealtimeClient} from './realtime-client';

import parseReply from '../../../shared/parse/reply';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import onReactionsUpdateMixin from './mixins/on-reactions-update';

import {MODEL_STATE_DRAFT} from '../../../shared/constants/model-states';
import {NAVIGATE_TO_TOPIC} from '../../../shared/constants/navigation';
import {
  UPDATE_REPLY_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE,
  SUBSCRIPTION_STATE_PENDING,
  UPDATE_REPLY_REACTIONS
} from '../../../shared/constants/forum.js';

import {SUBMIT_NEW_REPLY} from '../../../shared/constants/create-reply';
import {
  UPDATE_REPLY,
  CANCEL_UPDATE_REPLY,
  SAVE_UPDATE_REPLY,
  TOPIC_REPLIES_COMMENT_SORT_NAME,
  TOPIC_REPLIES_LIKED_SORT_NAME,
  TOPIC_REPLIES_RECENT_SORT_NAME,
  UPDATE_REPLY_IS_EDITING
} from '../../../shared/constants/topic';



export const ReplyModel = BaseModel.extend({

  // Theres a problem with the realtime client here. When a message comes in from
  // the realtime connection it will create a new model and patch the values onto an existing model.
  // If you have any defaults the patch model with override the current models values with the defaults.
  // Bad Times.
  //
  // via @cutandpastey, https://github.com/troupe/gitter-webapp/pull/2293#discussion_r81304415
  defaults: {
    isEditing: false
  },

  // Why doesn't this just come from it's owner collection?
  url() {
    return this.get('id') ?
    `/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies/${this.get('id')}`:
    `/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies`;
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
    subscribe(UPDATE_REPLY, this.updateReplyText, this);
    subscribe(CANCEL_UPDATE_REPLY, this.cancelEditReply, this);
    subscribe(SAVE_UPDATE_REPLY, this.saveUpdatedModel, this);
    subscribe(UPDATE_REPLY_IS_EDITING, this.onReplyIsEditingUpdate, this);
    subscribe(REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, this.onRequestSubscriptionStateUpdate, this);
    subscribe(UPDATE_REPLY_SUBSCRIPTION_STATE, this.onSubscriptionStateUpdate, this);
    subscribe(UPDATE_REPLY_REACTIONS, this.onReactionsUpdate, this);
    router.on('change:topicId', this.onActiveTopicUpdate, this);
    router.on('change:sortName', this.sort, this);
  },

  //Sorting should be accounted for from the API
  //TODO move to API requests like the topics-store
  //this logic is also duplicated in server/stores/replies-store.js
  comparator(a, b){
    //Get the count for likes
    const aLikeCount = ((a.get('reactions') || {}).like || 0);
    const bLikeCount = ((b.get('reactions') || {}).like || 0);

    //Do some sorting
    switch(router.get('sortName')) {
      case TOPIC_REPLIES_COMMENT_SORT_NAME:
        return b.get('commentsTotal') - a.get('commentsTotal');
      case TOPIC_REPLIES_LIKED_SORT_NAME:
        return bLikeCount - aLikeCount;
      case TOPIC_REPLIES_RECENT_SORT_NAME:
        return new Date(b.get('sent')) - new Date(a.get('sent'));
    }
  },

  getById(id) {
    const model = this.get(id);
    if(!model) { return; }
    return parseReply(model.toPOJO());
  },

  getReplies(){
    return this.models.map(model => {
      return parseReply(model.toPOJO());
    });
  },

  createNewReply(data){
    this.create({
      text: data.body,
      user: getCurrentUser(),
      sent: new Date().toISOString(),
      state: MODEL_STATE_DRAFT
    });
  },

  onActiveTopicUpdate(router, topicId){
    this.contextModel.set('topicId', topicId);
  },

  onNavigateToTopic(){
    this.reset([]);
  },

  updateReplyText({ replyId, text }) {
    const model = this.get(replyId);
    if(!model) { return; }
    model.set('text', text);
  },

  cancelEditReply({ replyId }) {
    const model = this.get(replyId);
    if(!model) { return; }
    model.set('text', null);
  },

  saveUpdatedModel({ replyId }){
    const model = this.get(replyId);
    if(!model) { return; }
    const text = model.get('text');
    if(text === null) { return; }
    model.save({ text: text }, { patch: true });
  },

  onReplyIsEditingUpdate({ replyId, isEditing }) {
    const reply = this.get(replyId);
    if(!reply) { return; }

    reply.set({
      isEditing
    });
  },

  onRequestSubscriptionStateUpdate({ replyId }) {
    const reply = this.get(replyId);
    if(!reply) { return; }

    reply.set({
      subscriptionState: SUBSCRIPTION_STATE_PENDING
    });
  },

  onSubscriptionStateUpdate({ replyId, state }) {
    const reply = this.get(replyId);
    if(!reply) { return; }

    reply.set({
      subscriptionState: state
    });
  }

});

dispatchOnChangeMixin(RepliesStore, [
  'change:subscriptionState',
  'change:text',
  'change:body',
  'change:isEditing'
], {
  delay: function(model) {
    // We need synchronous updates so the cursor is managed properly
    if(model && (model.get('isEditing') || model.get('state') === MODEL_STATE_DRAFT)) {
      return 0;
    }
  }
});
onReactionsUpdateMixin(RepliesStore, 'onReactionsUpdate');


const serverStore = (window.context.repliesStore|| {});
const serverData = (serverStore.data || [])
let store;

export function getRepliesStore(data){
  if(!store){ store = new RepliesStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
