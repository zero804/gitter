import { TAGS_UPDATE } from '../../constants/create-topic.js';

export default function tagsUpdate(tag, isAdding = true) {
  //TODO validate
  return {
    type: TAGS_UPDATE,
    tag,
    isAdding
  };
}
