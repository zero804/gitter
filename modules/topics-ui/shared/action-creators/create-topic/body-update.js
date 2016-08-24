import { BODY_UPDATE } from '../../constants/create-topic.js';

export default function bodyUpdate(body){
  return {
    type: BODY_UPDATE,
    body: body
  };
}
