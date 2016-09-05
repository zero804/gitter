//TODO Extend a Topic Model
import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import * as consts from '../../../shared/constants/create-topic';

export default Backbone.Model.extend({

  initialize(){
    subscribe(consts.TITLE_UPDATE, this.onTitleUpdate, this);
    subscribe(consts.BODY_UPDATE, this.onBodyUpdate, this);
    subscribe(consts.CATEGORY_UPDATE, this.onCategoryUpdate, this);
  },

  onTitleUpdate(data){
    this.set('title', data.title);
  },

  onBodyUpdate(data){
    this.set('body', data.body);
  },

  onCategoryUpdate(data){
    this.set('categoryId', data.categoryId);
  }

});
