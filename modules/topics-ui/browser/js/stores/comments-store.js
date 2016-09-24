import Backbone from 'backbone';
import LiveCollection from './live-collection';
import { BaseModel } from './base-model';

import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {subscribe} from '../../../shared/dispatcher';

import {getRealtimeClient} from './realtime-client';
import {getForumId} from './forum-store';
import router from '../routers';
import {getCurrentUser} from './current-user-store';

import {
  SHOW_REPLY_COMMENTS,
  UPDATE_COMMENT,
  UPDATE_CANCEL_COMMENT,
  UPDATE_SAVE_COMMENT
} from '../../../shared/constants/topic';

import {SUBMIT_NEW_COMMENT} from '../../../shared/constants/create-comment';

export const CommentStore = BaseModel.extend({
  url(){
    return `/api/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies/${this.get('replyId')}/comments`;
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
    subscribe(SUBMIT_NEW_COMMENT, this.onSubmitNewComment, this);
    subscribe(UPDATE_COMMENT, this.onCommentUpdate, this);
    subscribe(UPDATE_CANCEL_COMMENT, this.onCommmentEditCanceled, this);
    subscribe(UPDATE_SAVE_COMMENT, this.onCommentSave, this);
    this.listenTo(router, 'change:replyId', this.onReplyIdUpdate, this);
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

  onReplyIdUpdate(router, topicId){
    this.contextModel.set('topicId', topicId);
  },

  onSubmitNewComment({ replyId, text }) {
    this.create({
      replyId: replyId,
      text: text,
      user: getCurrentUser(),
    })
  },

  onCommentUpdate({commentId, text}){
    const model = this.get(commentId);
    if(!model) { return; }
    model.set('text', text);
  },

  onCommmentEditCanceled({commentId}){
    const model = this.get(commentId);
    if(!model) { return; }
    model.set('text', null);
  },

  onCommentSave({commentId}) {
    const model = this.get(commentId);
    if(!model) { return; }
    model.save();
  }

});

dispatchOnChangeMixin(CommentsStore);

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
