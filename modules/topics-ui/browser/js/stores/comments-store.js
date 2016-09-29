import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {getRealtimeClient} from './realtime-client';
import LiveCollection from './live-collection';
import { BaseModel } from './base-model';

import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import onReactionsUpdateMixin from './mixins/on-reactions-update';

import {getForumId} from './forum-store';
import {getCurrentUser} from './current-user-store';
import router from '../routers';

import { SHOW_REPLY_COMMENTS } from '../../../shared/constants/topic';
import { SUBMIT_NEW_COMMENT } from '../../../shared/constants/create-comment';
import { UPDATE_COMMENT_REACTIONS } from '../../../shared/constants/forum.js';


export const CommentModel = BaseModel.extend({
  url(){
    return `/api/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies/${this.get('replyId')}/comments`;
  }
});

export const CommentsStore = LiveCollection.extend({
  model: CommentModel,
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
    subscribe(SUBMIT_NEW_COMMENT, this.onSubmitNewComment, this);
    subscribe(UPDATE_COMMENT_REACTIONS, this.onReactionsUpdate, this);
    this.listenTo(router, 'change:topicId', this.onTopicIdUpdate, this);
  },

  getComments(){
    return this.toJSON();
  },

  getCommentsByReplyId(id){
    if(id !== this.contextModel.get('replyId')) { return; }
    return this.toJSON();
  },

  getActiveReplyId(){
    return this.contextModel.get('replyId');
  },

  onRequestNewComments({replyId}){
    this.contextModel.set('replyId', replyId);
  },

  onTopicIdUpdate(router, topicId){
    this.contextModel.set('topicId', topicId);
  },

  onSubmitNewComment({ replyId, text }) {
    this.create({
      replyId: replyId,
      text: text,
      user: getCurrentUser(),
    })
  },

});

dispatchOnChangeMixin(CommentsStore);
onReactionsUpdateMixin(CommentsStore, 'onReactionsUpdate');

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
