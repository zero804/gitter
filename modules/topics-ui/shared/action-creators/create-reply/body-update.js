import { BODY_UPDATE } from '../../constants/create-topic.js';

export default function bodyUpdate(val){

  if(!val) { throw new Error('updateReplyBody called with no value'); }

  return {
    type: BODY_UPDATE,
    value: val
  };
}
