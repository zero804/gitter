import moment from 'moment';
import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../constants/forum.js';

export default function parseReply(reply) {
  var result = Object.assign({}, reply, {
    formattedSentDate: moment(reply.sent).format('MMM Do'),
    subscriptionState: reply.subscriptionState || (reply.subscribed ? SUBSCRIPTION_STATE_SUBSCRIBED : SUBSCRIPTION_STATE_UNSUBSCRIBED)
  });

  delete result.subscribed;

  return result;
}
