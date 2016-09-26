import { SUBSCRIPTION_STATE } from '../constants/forum.js';

export default function parseTopic(topic) {
  var result = Object.assign({}, topic, {
    subscriptionState: topic.subscriptionState || (topic.subscribed ? SUBSCRIPTION_STATE.SUBSCRIBED : SUBSCRIPTION_STATE.UNSUBSCRIBED)
  });
  delete result.subscribed;

  return result;
}
