import {equal, ok} from 'assert';
import {spy} from 'sinon';
import {shallow} from 'enzyme';
import {subscribe} from '../../../../shared/dispatcher';
import React from 'react';
import TopicContainer from '../../../../shared/containers/TopicContainer.jsx';
import topicsStore from '../../../mocks/topic-store';
import categoryStore from '../../../mocks/category-store';
import repliesStore from '../../../mocks/replies-store';
import currentUserStore from '../../../mocks/current-user-store';
import {BODY_UPDATE} from '../../../../shared/constants/create-reply';

describe('<TopicContainer />', () => {

  let wrapper;

  beforeEach(function(){
    wrapper = shallow(
      <TopicContainer
        topicsStore={topicsStore}
        categoryStore={categoryStore}
        repliesStore={repliesStore}
        currentUserStore={currentUserStore}
        topicId="1"
        groupName="gitterHQ"/>
    );
  });

  it('should render a TopicHeader component', () => {
    equal(wrapper.find('TopicHeader').length, 1);
  });

  it('should render a TopicBody', () => {
    equal(wrapper.find('TopicBody').length, 1);
  });

  it('should render a SearchHeader', () => {
    equal(wrapper.find('SearchHeader').length, 1);
  });

  it('should render a TopicReplyEditor', () => {
    equal(wrapper.find('TopicReplyEditor').length, 1);
  });

  it('should render a TopicReplyListHeader', () => {
    equal(wrapper.find('TopicReplyListHeader').length, 1);
  });

  it('should render a TopicReplyList', () => {
    equal(wrapper.find('TopicReplyList').length, 1);
  });

  it('should pass the currentUser to the editor', () => {
    ok(
      wrapper.find('TopicReplyEditor').prop('user'),
      'currentUser was not passed to TopicReplyEditor'
    );
  });

  it('should dispatch the right action when the reply body updates', () => {
    const handle = spy();
    subscribe(BODY_UPDATE, handle);
    wrapper.find('TopicReplyEditor').at(0).prop('onChange')('value');
    equal(
      handle.callCount, 1,
      'Failed to dispatch the correct action when the editor updated'
    );
  });

});
