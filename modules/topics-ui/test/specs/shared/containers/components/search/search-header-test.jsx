import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';

import SearchHeader from '../../../../../../shared/containers/components/search/search-header.jsx';
import { SUBSCRIPTION_STATE_UNSUBSCRIBED } from '../../../../../../shared/constants/forum';

describe('<SearchHeader/>', () => {

  let wrapper;
  const groupUri = 'gitterHQ'
  const groupName = 'gitterHQ'

  describe('', () => {
    beforeEach(() => {
      wrapper = shallow(
        <SearchHeader
          groupUri={groupUri}
          groupName={groupName}
          subscriptionState={SUBSCRIPTION_STATE_UNSUBSCRIBED} />
      );
    });

    it('should render a container', () => {
      equal(wrapper.find('Container').length, 1);
    });

    it('should render a panel', () => {
      equal(wrapper.find('Panel').length, 1);
    });

    it('should render a ForumCategoryLink', () => {
      equal(wrapper.find('ForumCategoryLink').length, 1);
    });

    it('should have the community name in the ForumCategoryLink', () => {
      equal(wrapper.find('ForumCategoryLink').childAt(0).text(), groupName);
    });


    it('should render a h1', () => {
      equal(wrapper.find('H1').length, 1);
    });

    it('should render an Input', () => {
      equal(wrapper.find('Input').length, 1);
    });

    it('should render a CreateTopicLink', () => {
      equal(wrapper.find('CreateTopicLink').length, 1);
    });

    it('should render the create topic link with the right class', () => {
      equal(wrapper.find('.topic-search__create-topic-link').length, 1);
    });

    it('should render a custom class for the input', () => {
      equal(wrapper.find('.topic-search__search-input').length, 1);
    });
  });

});
