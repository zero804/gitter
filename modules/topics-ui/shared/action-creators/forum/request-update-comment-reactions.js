import { REQUEST_UPDATE_COMMENT_REACTIONS } from '../../constants/forum.js';

export default function requestUpdateCommentReactions(replyId, commentId, reactionKey, isReacting) {
  return {
    type: REQUEST_UPDATE_COMMENT_REACTIONS,
    replyId,
    commentId,
    reactionKey,
    isReacting
  };
}
