import React from 'react';
import Backbone from 'backbone';
import { equal } from 'assert';
import { shallow } from 'enzyme';
import { subscribe } from '../../../../shared/dispatcher';
import { spy } from 'sinon';
import CreateTopicContainer from '../../../../shared/containers/CreateTopicContainer.jsx';
import * as createConst from '../../../../shared/constants/create-topic';

describe.only('<CreateTopicContainer />', () => {

  let wrapper;
  let newTopicStore;

  beforeEach(() => {
    newTopicStore = new Backbone.Model({ title: 'title', body: 'body' });
    wrapper = shallow(<CreateTopicContainer newTopicStore={newTopicStore} />);
  });

  it('should render the create topic modal', () => {
    equal(wrapper.find('CreateTopicModal').length, 1);
  });

  it('should dispatch a title update event when the title updates', () => {
    const handle = spy();
    subscribe(createConst.TITLE_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onTitleChange')('This is a topic');
    equal(handle.callCount, 1);
  });

 it('should dispatch a title update event when the title updates', () => {
    const handle = spy();
    subscribe(createConst.BODY_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onBodyChange')('This is some body copy');
    equal(handle.callCount, 1);
  });

 it('should dispatch the right event when the form is submitted', () => {
    const handle = spy();
    subscribe(createConst.SUBMIT, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onSubmit')()
    equal(handle.callCount, 1);
 });

 it('should dispatch an event when the store emits a STORE_CREATE_NEW event', () => {

 });

});
