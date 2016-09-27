import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicHeader from '../../../../../../shared/containers/components/topic/topic-header.jsx';
import topics from '../../../../../mocks/mock-data/topics';
import categories from '../../../../../mocks/mock-data/categories';

describe('<TopicHeader/>', () => {

  let wrapper;
  const topic = topics[0];
  const category = categories[0];

  beforeEach(() => {
    wrapper = shallow(
      <TopicHeader
        tags={topic.tags}
        topic={topic}
        category={category}
        groupUri="gitterHQ"/>
    );
  });

  it('should render a continer element', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render a header', () => {
    equal(wrapper.find('header').length, 1);
  });

  it('should render a H1', () => {
    equal(wrapper.find('H1').length, 1);
  });

  it('should render a custom container', () => {
    equal(wrapper.find('.container--topic-header').length, 1);
  });

  it('should render a user avatar', () => {
    equal(wrapper.find('UserAvatar').length, 1);
  });

  it('should render a .topic-header', () => {
    equal(wrapper.find('.topic-header').length, 1);
  });

  it('should render the right header', () => {
    equal(wrapper.find('.topic-header__title').length, 1);
  });

  it('should render a user name', () => {
    equal(wrapper.find('.topic-header__username').length, 1);
  });

  it('should render a control row', () => {
    equal(wrapper.find('.topic-header__control-row').length, 1);
  });

  it('should render a custom avatar', () => {
    equal(wrapper.find('.topic-header__avatar').length, 1);
  });

  it('should render a ForumCategoryLink', () => {
    equal(wrapper.find('ForumCategoryLink').length, 1);
  });

  it('should render a ForumTagLink ofr each tag', () => {
    equal(wrapper.find('ForumTagLink').length, topic.tags.length);
  });

});
