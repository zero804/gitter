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

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId(),
      topicId: router.get('topicId'),
    });
  },

  initialize(){
    subscribe(SUBMIT_NEW_REPLY, this.createNewReply, this);
    subscribe(NAVIGATE_TO_TOPIC, this.onNavigateToTopic, this);
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
