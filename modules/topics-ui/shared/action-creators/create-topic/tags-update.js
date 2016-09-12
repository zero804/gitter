import { TAGS_UPDATE } from '../../constants/create-topic.js';

export default function tagsUpdate(tag){
  //TODO validate
  return {
    type: TAGS_UPDATE,
    tag: tag
  };
}
