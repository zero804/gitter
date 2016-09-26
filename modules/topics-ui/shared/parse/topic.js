import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../constants/forum.js';

export default function parseTopic(topic) {
  var result = Object.assign({}, topic, {
    subscriptionState: topic.subscriptionState || (topic.subscribed ? SUBSCRIPTION_STATE_SUBSCRIBED : SUBSCRIPTION_STATE_UNSUBSCRIBED)
  });
  delete result.subscribed;

  return result;
}
