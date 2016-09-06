import moment from 'moment';

export default function parseReply(reply) {
  return Object.assign({}, reply, {
    formattedSentDate: moment(reply.sent).format('MMM Do')
  });
}
