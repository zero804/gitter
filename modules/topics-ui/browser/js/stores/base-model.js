import Backbone from 'backbone';
import $ from 'jquery';
import {getAccessToken} from './access-token-store';

export const BaseModel = Backbone.Model.extend({
  sync(method, model, options){

    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": getAccessToken() }
    const data = JSON.stringify(this.toJSON());

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
