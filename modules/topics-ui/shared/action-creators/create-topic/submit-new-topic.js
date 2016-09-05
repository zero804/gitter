import { SUBMIT_NEW_TOPIC } from '../../constants/create-topic.js';

export default function submitNewTopic(title, body, categoryId){

  //TODO add validate here

  return {
    type: SUBMIT_NEW_TOPIC,
    title: title,
    body: body,
    categoryId: categoryId
  };
}
