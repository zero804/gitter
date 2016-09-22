import { SUBMIT_NEW_COMMENT } from '../../constants/create-comment.js';

export default function submitNewComment(replyId, text){
  return {
    type: SUBMIT_NEW_COMMENT,
    replyId: replyId,
    text: text
  };
}
