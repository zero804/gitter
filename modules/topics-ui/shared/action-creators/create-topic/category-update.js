import { CATEGORY_UPDATE } from '../../constants/create-topic.js';

export default function categoryUpdate(categoryId){
  return {
    type: CATEGORY_UPDATE,
    categoryId: categoryId,
  };
}
