import Backbone from 'backbone';
import {getRealtimeClient} from './realtime-client';
import {getForumId} from './forum-store';
import LiveCollection from './live-collection';
import { BaseModel } from './base-model';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

export const CommentStore = BaseModel.extend({
  url(){
    //TODO
  }
});

export const CommentsStore = LiveCollection.extend({
  model: CommentStore,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/comments',

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId(),
      replyId: null,
    });
  },

  getComments(){
    return this.toJSON();
  },

  getCommentsByReplyId(id){
    if(id !== this.contextModel.get('replyId')) { return; }
    return this.toJSON();
  }

});

dispatchOnChangeMixin(CommentsStore);

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
