import { TAGS_UPDATE } from '../../constants/create-topic.js';

export default function tagsUpdate(tags){
  //TODO validate
  return {
    type: TAGS_UPDATE,
    tags: tags
  };
}
