import { UPDATE_REPLY_REACTIONS } from '../../constants/forum.js';

export default function updateReplyReactions(replyId, reactionKey, isReacting) {
  return {
    type: UPDATE_REPLY_REACTIONS,
    replyId,
    reactionKey,
    isReacting
  };
}
