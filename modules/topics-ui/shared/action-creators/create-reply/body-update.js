import { BODY_UPDATE } from '../../constants/create-topic.js';

export default function bodyUpdate(val){
  return {
    type: BODY_UPDATE,
    value: val
  };
}
