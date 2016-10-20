import { UPDATE_COMMENT_REACTIONS } from '../../constants/forum.js';

export default function updateCommentReactions(commentId, reactionKey, isReacting) {
  return {
    type: UPDATE_COMMENT_REACTIONS,
    commentId,
    reactionKey,
    isReacting
  };
}
