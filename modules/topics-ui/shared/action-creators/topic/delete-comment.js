import { DELETE_COMMENT } from '../../constants/topic.js';

export default function deleteComment(commentId, replyId) {
  return {
    type: DELETE_COMMENT,
    commentId,
    replyId
  };
}
