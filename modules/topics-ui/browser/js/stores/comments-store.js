import Backbone from 'backbone';
import {getRealtimeClient} from './realtime-client';
import {getForumId} from './forum-store';
import LiveCollection from './live-collection';
import { BaseModel } from './base-model';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {subscribe} from '../../../shared/dispatcher';
import {SHOW_REPLY_COMMENTS} from '../../../shared/constants/topic';
import router from '../routers';

export const CommentStore = BaseModel.extend({
  url(){
    //TODO
  }
});

export const CommentsStore = LiveCollection.extend({
  model: CommentStore,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/replies/:replyId/comments',

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId(),
      topicId: router.get('topicId'),
      replyId: null,
    });
  },

  initialize(){
    subscribe(SHOW_REPLY_COMMENTS, this.onRequestNewComments, this);
    this.listenTo(router, 'change:replyId', this.onReplyIdUpdate, this);
  },

  getComments(){
    return this.toJSON();
  },

  getCommentsByReplyId(id){
    if(id !== this.contextModel.get('replyId')) { return; }
    return this.toJSON();
  },

  onRequestNewComments({replyId}){
    this.contextModel.set('replyId', replyId);
  },

  onReplyIdUpdate(router, topicId){
    this.contextModel.set('topicId', topicId);
  }

});

dispatchOnChangeMixin(CommentsStore);

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
