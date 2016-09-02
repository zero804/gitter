import moment from 'moment';

export default function parseReply(reply) {

  const body = (reply.body || {});
  const displayText = (body.html || reply.text);

  return Object.assign({}, reply, {
    formattedSentDate: moment(reply.sent).format('MMM Do'),
    displayText: displayText
  });
}
