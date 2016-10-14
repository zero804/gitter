import { UPDATE_TOPIC_CATEGORY } from '../../constants/topic.js';

export default function updateCategory(categoryId) {
  return {
    type: UPDATE_TOPIC_CATEGORY,
    categoryId
  };
}
