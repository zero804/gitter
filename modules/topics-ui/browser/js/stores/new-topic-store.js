//TODO Extend a Topic Model
import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import * as consts from '../../../shared/constants/create-topic';

export default Backbone.Model.extend({

  initialize(){
    subscribe(consts.TITLE_UPDATE, this.onTitleUpdate, this);
    subscribe(consts.BODY_UPDATE, this.onBodyUpdate, this);
  },

  onTitleUpdate(data){
    this.set('title', data.title);
    this.trigger(consts.STORE_UPDATE);
  },

  onBodyUpdate(data){
    this.set('body', data.body);
    this.trigger(consts.STORE_UPDATE);
  }

});
