import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED
} from '../constants/forum.js';

import {SYNCED} from '../constants/model-states';

export default function parseTopic(topic) {

  var result = Object.assign({}, topic, {
    subscriptionState: topic.subscriptionState || (topic.subscribed ? SUBSCRIPTION_STATE_SUBSCRIBED : SUBSCRIPTION_STATE_UNSUBSCRIBED),
    state: SYNCED
  });

  delete result.subscribed;

  return result;
}
