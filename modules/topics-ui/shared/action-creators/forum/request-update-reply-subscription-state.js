import { REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function requestUpdateReplySubscriptionState(replyId, isSubscribed) {
  return {
    type: REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE,
    replyId,
    isSubscribed: isSubscribed
  };
}
