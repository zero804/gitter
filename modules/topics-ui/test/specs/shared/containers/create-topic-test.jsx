import React from 'react';
import { equal } from 'assert';
import { shallow } from 'enzyme';
import { subscribe } from '../../../../shared/dispatcher';
import { spy } from 'sinon';
import CreateTopicContainer from '../../../../shared/containers/CreateTopicContainer.jsx';
import * as createConst from '../../../../shared/constants/create-topic';

describe.only('<CreateTopicContainer />', () => {

  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<CreateTopicContainer />);
  });

  it('should render the create topic modal', () => {
    equal(wrapper.find('CreateTopicModal').length, 1);
  });

  it('should dispatch a title update event when the title updates', () => {
    const handle = spy();
    subscribe(createConst.TITLE_UPDATE, handle);
    wrapper.find('CreateTopicModal').prop('onTitleChange')('This is a topic');
    equal(handle.callCount, 1);
  });

});
