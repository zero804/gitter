import moment from 'moment';
import { SUBSCRIPTION_STATE } from '../constants/forum.js';

export default function parseReply(reply) {
  var result = Object.assign({}, reply, {
    formattedSentDate: moment(reply.sent).format('MMM Do'),
    subscriptionState: reply.subscriptionState || (reply.subscribed ? SUBSCRIPTION_STATE.SUBSCRIBED : SUBSCRIPTION_STATE.UNSUBSCRIBED)
  });

  delete result.subscribed;

  return result;
}
