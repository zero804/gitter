import { UPDATE_REPLY_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function updateReplyWatchState(forumId, topicId, replyId, state) {
  return {
    type: UPDATE_REPLY_SUBSCRIPTION_STATE,
    forumId,
    topicId,
    replyId,
    state
  };
}
