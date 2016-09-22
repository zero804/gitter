import { COMMENT_BODY_UPDATE } from '../../constants/create-comment.js';

export default function bodyUpdate(replyId, val){
  return {
    type: COMMENT_BODY_UPDATE,
    replyId: replyId,
    val: val
  };
}
