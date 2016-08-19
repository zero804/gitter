import {TITLE_UPDATE} from '../../../shared/constants/create-topic';

module.exports = function titleUpdate(title){
  return {
    type: TITLE_UPDATE,
    title: title
  };
};
