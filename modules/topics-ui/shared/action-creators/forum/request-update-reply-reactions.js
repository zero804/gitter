import { REQUEST_UPDATE_REPLY_REACTIONS } from '../../constants/forum.js';

export default function requestUpdateReplyReactions(replyId, reactionKey, isReacting) {
  return {
    type: REQUEST_UPDATE_REPLY_REACTIONS,
    replyId,
    reactionKey,
    isReacting
  };
}
