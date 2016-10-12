import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import {spy} from 'sinon';
import ForumCategoryLink from '../../../../../../shared/containers/components/links/forum-category-link.jsx';
import categories from '../../../../../mocks/mock-data/categories';
import {NAVIGATE_TO_CATEGORY} from '../../../../../../shared/constants/forum-categories';
import {subscribe} from '../../../../../../shared/dispatcher';
import mockEvt from '../../../../../mocks/event';
import {DEFAULT_CATEGORY_NAME} from '../../../../../../shared/constants/navigation';

describe('<ForumCategoryLink/>', () => {

  let wrapper;
  const category = categories[1];

  beforeEach(() => {
    wrapper = shallow(
      <ForumCategoryLink groupUri="gitterHQ" category={category}>
      Some test text
      </ForumCategoryLink>
    );
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should render the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), `View all ${category.category} topics`);
  });

  it('should render the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), `/gitterHQ/topics/categories/${category.slug}`);
  });

  it('should generate a different link for the "all" category', () => {
    wrapper = shallow(
      <ForumCategoryLink
      groupUri="gitterHQ"
      category={{category: DEFAULT_CATEGORY_NAME, slug: 'all'}}>
      test
      </ForumCategoryLink>
    )
    equal(wrapper.find('a').at(0).prop('href'), '/gitterHQ/topics');
  });

  it('should dispatch a navigate to category event when clicked', () => {
    const handle = spy();
    subscribe(NAVIGATE_TO_CATEGORY, handle);
    wrapper.find('a').simulate('click', mockEvt);
    equal(handle.callCount, 1);
  });

});
