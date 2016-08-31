import {ReplyStore} from './replies-store';
import {subscribe} from '../../../shared/dispatcher';
import {BODY_UPDATE} from '../../../shared/constants/create-reply';

export default ReplyStore.extend({
  defaults: {},
  initialize() {
    subscribe(BODY_UPDATE, this.onReplyBodyUpdate, this);
  },

  onReplyBodyUpdate(data){
    this.set('text', data.value);
  }
});
