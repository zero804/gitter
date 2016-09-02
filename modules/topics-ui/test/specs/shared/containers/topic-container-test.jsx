import {equal} from 'assert';
import {shallow} from 'enzyme';
import React from 'react';
import TopicContainer from '../../../../shared/containers/TopicContainer.jsx';
import topicsStore from '../../../mocks/topic-store';
import categoryStore from '../../../mocks/category-store';
import repliesStore from '../../../mocks/replies-store';

describe('<TopicContainer />', () => {

  let wrapper;

  beforeEach(function(){
    wrapper = shallow(
      <TopicContainer
      topicsStore={topicsStore}
      categoryStore={categoryStore}
      repliesStore={repliesStore}
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

});
