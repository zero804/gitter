import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import {COMMENT_BODY_UPDATE} from '../../../shared/constants/create-comment';
import {SHOW_REPLY_COMMENTS} from '../../../shared/constants/topic';

export const NewCommentStore = Backbone.Model.extend({

  defaults: {
    text: '',
  },

  initialize(){
    subscribe(COMMENT_BODY_UPDATE, this.onCommentBodyUpdate, this);
    subscribe(SHOW_REPLY_COMMENTS, this.onCommentFocusReset, this);
  },

  onCommentBodyUpdate({replyId, val}){
    this.set({ replyId: replyId, text: val});
  },

  onCommentFocusReset(){
    this.clear();
  }
});
