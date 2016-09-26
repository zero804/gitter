import Backbone from 'backbone';
import $ from 'jquery';
import {getAccessToken} from './access-token-store';

export const BaseModel = Backbone.Model.extend({

  //This is here whilst we have to parse out tags for saving
  //It will go away
  getDataToSave(){
    return this.toJSON();
  },

  parse(res){
    //We only update text when the user locally updates a resource
    //when we get data from the server we need to wipe this out
    return Object.assign({}, res, {
      text: null,
    });
  },

  sync(method, model, options){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": getAccessToken() }
    const data = JSON.stringify(this.getDataToSave());
    const defaults = {
      url: model.url(),
      contentType: 'application/json',
      headers: headers,
      data: data,
      success: options.success,
      error: options.error
    }

    if(method === 'update') {
      $.ajax(Object.assign({}, defaults, {
        method: 'PATCH',
        //When we update a resource locally we change the `text` property
        data: JSON.stringify({ text: model.get('text') }),
      }));
    }

    if(method === 'create') {
      $.ajax(Object.assign({}, defaults, {
        method: 'POST'
      }));
    }

  }
});
