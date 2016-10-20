import {subscribe} from '../../../shared/dispatcher';
import {COMMENT_BODY_UPDATE, SUBMIT_NEW_COMMENT} from '../../../shared/constants/create-comment';
import {SHOW_REPLY_COMMENTS} from '../../../shared/constants/topic';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import { BaseModel } from './base-model';

const NewCommentStore = BaseModel.extend({

  defaults: {
    text: '',
  },

  initialize(){
    subscribe(COMMENT_BODY_UPDATE, this.onCommentBodyUpdate, this);
    subscribe(SHOW_REPLY_COMMENTS, this.onCommentFocusReset, this);
    subscribe(SUBMIT_NEW_COMMENT, this.onCommentSubmitted, this);
  },

  onCommentBodyUpdate({replyId, val}){
    this.set({
      replyId: replyId,
      text: val
    });
  },

  onCommentFocusReset(){
    this.set({
      replyId: null,
      text: ''
    });
  },

  onCommentSubmitted(){
    this.set({
      replyId: null,
      text: ''
    });
  }

});

dispatchOnChangeMixin(NewCommentStore, ['change:text'], {
  // We need synchronous updates so the cursor is managed properly
  delay: 0
});

export default NewCommentStore;
