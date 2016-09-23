import Backbone from 'backbone';
import $ from 'jquery';
import {getAccessToken} from './access-token-store';

export const BaseModel = Backbone.Model.extend({

  //This is here whilst we have to parse out tags for saving
  //It will go away
  getDataToSave(){
    return this.toJSON();
  },

  sync(method, model, options){

    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": getAccessToken() }
    const data = JSON.stringify(this.getDataToSave());

    //TODO NEED TO ADD UPDATE METHOD

    if(method === 'create') {
      $.ajax({
        url: model.url(),
        contentType: 'application/json',
        type: 'POST',
        headers: headers,
        data: data,
        success: options.success,
        error: options.error
      });
    }

  }
});
