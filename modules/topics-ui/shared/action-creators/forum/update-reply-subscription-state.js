import { UPDATE_REPLY_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function updateReplySubscriptionState(replyId, state) {
  return {
    type: UPDATE_REPLY_SUBSCRIPTION_STATE,
    replyId,
    state
  };
}
