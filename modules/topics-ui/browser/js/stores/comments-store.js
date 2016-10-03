import Backbone from 'backbone';

import {subscribe} from '../../../shared/dispatcher';
import LiveCollection from './live-collection';
import { BaseModel } from './base-model';

import { getRealtimeClient } from './realtime-client';
import { getForumId } from './forum-store';
import {getCurrentUser} from './current-user-store';
import router from '../routers';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import onReactionsUpdateMixin from './mixins/on-reactions-update';

import { SUBMIT_NEW_COMMENT } from '../../../shared/constants/create-comment';
import { UPDATE_COMMENT_REACTIONS } from '../../../shared/constants/forum.js';
import {MODEL_STATE_DRAFT} from '../../../shared/constants/model-states';
import {
  SHOW_REPLY_COMMENTS,
  UPDATE_COMMENT,
  UPDATE_CANCEL_COMMENT,
  UPDATE_SAVE_COMMENT,
  UPDATE_COMMENT_IS_EDITING
} from '../../../shared/constants/topic';


export const CommentModel = BaseModel.extend({
  // Theres a problem with the realtime client here. When a message comes in from
  // the realtime connection it will create a new model and patch the values onto an existing model.
  // If you have any defaults the patch model with override the current models values with the defaults.
  // Bad Times.
  //
  // via @cutandpastey, https://github.com/troupe/gitter-webapp/pull/2293#discussion_r81304415
  defaults: {
    isEditing: false
  },

  url(){
    return this.get('id') ?
    `/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies/${this.get('replyId')}/comments/${this.get('id')}`:
    `/v1/forums/${getForumId()}/topics/${router.get('topicId')}/replies/${this.get('replyId')}/comments`;
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
    subscribe(UPDATE_COMMENT, this.onCommentUpdate, this);
    subscribe(UPDATE_CANCEL_COMMENT, this.onCommmentEditCanceled, this);
    subscribe(UPDATE_SAVE_COMMENT, this.onCommentSave, this);
    subscribe(UPDATE_COMMENT_IS_EDITING, this.onCommentIsEditingUpdate, this);
    subscribe(UPDATE_COMMENT_REACTIONS, this.onReactionsUpdate, this);
    this.listenTo(router, 'change:topicId', this.onTopicIdUpdate, this);
  },

  getComments() {
    return this.toPOJO();
  },

  getCommentsByReplyId(id){
    if(id !== this.contextModel.get('replyId')) { return []; }
    return this.toPOJO();
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
      sent: new Date().toISOString(),
      state: MODEL_STATE_DRAFT
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

  onCommentSave({commentId, replyId}) {
    const model = this.get(commentId);
    if(!model) { return; }
    const text = model.get('text');
    if(text === null) { return; }
    model.set('replyId', replyId);
    model.save({ text: text }, { patch: true });
  },

  onCommentIsEditingUpdate({ commentId, isEditing }) {
    const comment = this.get(commentId);
    if(!comment) { return; }

    comment.set({
      isEditing
    });
  }

});

dispatchOnChangeMixin(CommentsStore, [
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
onReactionsUpdateMixin(CommentsStore, 'onReactionsUpdate');

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
