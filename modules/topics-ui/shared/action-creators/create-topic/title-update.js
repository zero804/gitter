import {TITLE_UPDATE} from '../../../shared/constants/create-topic';

export default function titleUpdate(title){
  return {
    type: TITLE_UPDATE,
    title: title
  };
};
