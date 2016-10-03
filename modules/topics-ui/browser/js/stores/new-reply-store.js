import {ReplyModel} from './replies-store';
import {subscribe} from '../../../shared/dispatcher';
import {BODY_UPDATE, SUBMIT_NEW_REPLY} from '../../../shared/constants/create-reply';
import dipatchOnChangeMixin from './mixins/dispatch-on-change';

const NewReplyStore = ReplyModel.extend({
  defaults: {},
  events: [ 'change:text' ],
  initialize() {
    subscribe(BODY_UPDATE, this.onReplyBodyUpdate, this);
    subscribe(SUBMIT_NEW_REPLY, this.onReplySubmit, this);
  },

  onReplyBodyUpdate({value}){
    this.set('text', value);
  },

  getTextContent(){
    return this.get('text');
  },

  onReplySubmit(){
    this.set('text', '');
  }

});

dipatchOnChangeMixin(NewReplyStore);

export default NewReplyStore;
