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

import {NAVIGATE_TO_TOPIC} from '../../../shared/constants/navigation';
import {SUBMIT_NEW_REPLY} from '../../../shared/constants/create-reply';
import {UPDATE_REPLY, CANCEL_UPDATE_REPLY, SAVE_UPDATE_REPLY} from '../../../shared/constants/topic';

export const ReplyStore = BaseModel.extend({
  url(){
    return this.get('id') ?
    null :
    `/api/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies`;
  },
});

export const RepliesStore = LiveCollection.extend({

  model: ReplyStore,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/replies',
  events: [ 'change:text' ],

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
    router.on('change:topicId', this.onActiveTopicUpdate, this);
  },

  getReplies(){
    return this.models.map(model => {
      return parseReply(model.toJSON())
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

  updateReplyText({replyId, text}) {
    const model = this.get(replyId);
    if(!model) { return; }
    model.set('text', text);
  },

  cancelEditReply({replyId}) {
    const model = this.get(replyId);
    if(!model) { return; }
    model.set('text', null);
  },

  saveUpdatedModel({replyId}){
    const model = this.get(replyId);
    if(!model) { return; }
    model.save();
  }

});

dispatchOnChangeMixin(RepliesStore);

const serverStore = (window.context.repliesStore|| {});
const serverData = (serverStore.data || [])
let store;

export function getRepliesStore(data){
  if(!store){ store = new RepliesStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
