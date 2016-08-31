import { SUBMIT_NEW_REPLY } from '../../constants/create-reply.js';

export default function submitNewReply(body){
  return {
    type: SUBMIT_NEW_REPLY,
    body: body,
  };
}
