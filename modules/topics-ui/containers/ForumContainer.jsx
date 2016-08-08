'use strict';

import React from 'react';
import _ from 'lodash';
import raf from 'raf';
import {subscribe, unsubscribe, dispatch} from '../browser/js/dispatcher';

import CategoryList from '../shared/components/forum/category-list.jsx';
import ForumTableControl from '../shared/components/forum/table-control.jsx';

import navigateToCategory from '../browser/js/action-creators/forum/navigate-to-category';
import navigateToFilter from '../browser/js/action-creators/forum/navigate-to-filter';
import navigateToSort from '../browser/js/action-creators/forum/navigate-to-sort';
import navigateToTag from '../browser/js/action-creators/forum/navigate-to-tag';

import forumCatConstants from '../browser/js/constants/forum-categories';
import forumTagConstants from '../browser/js/constants/forum-tags';
import forumFilterConstants from '../browser/js/constants/forum-filters';
import forumSortConstants from '../browser/js/constants/forum-sorts';
import navConstants from '../browser/js/constants/navigation';

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    //Route parameters ---
    groupName: React.PropTypes.string.isRequired,
    categoryName: React.PropTypes.string.isRequired,
    filterName: React.PropTypes.string,
    tagName: React.PropTypes.string,
    sortName: React.PropTypes.string,

    //Categories ---
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    }).isRequired,

    //Tags -----
    tagStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getTags: React.PropTypes.func.isRequired
    }).isRequired,
  },

  getDefaultProps(){
    return {
      filterName: navConstants.DEFAULT_FILTER_NAME,
      tagName: navConstants.DEFAULT_TAG_NAME,
      sortName: navConstants.DEFAULT_SORT_NAME
    };
  },

  getInitialState(){
    const { categoryStore, tagStore } = this.props;
    return {
      categoryName: this.props.categoryName,
      filterName: this.props.filterName,
      tagName: this.props.tagName,
      sortName: this.props.sortName,
      categories: categoryStore.getCategories(),
      tags: tagStore.getTags()
    };
  },

  componentDidMount(){
    const { categoryStore } = this.props;
    subscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
    subscribe(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    subscribe(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    subscribe(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
  },

  componentWillUnmount(){
    unsubscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
    unsubscribe(forumTagConstants.UPDATE_ACTIVE_TAG, this.onTagUpdate, this);
    unsubscribe(forumFilterConstants.UPDATE_ACTIVE_FILTER, this.onFilterUpdate, this);
    unsubscribe(forumSortConstants.UPDATE_ACTIVE_SORT, this.onSortUpdate, this);
  },

  render() {
    const { categories, categoryName, tags, filterName, tagName, sortName } = this.state;
    const { groupName } = this.props;
    return (
      <main>
        <CategoryList
          groupName={ groupName }
          categories={ categories }
          //Change this attribute name to categoryChange
          onCategoryClicked={ this.onCategoryClicked } />

        <ForumTableControl
          groupName={groupName}
          categoryName={categoryName}
          filterName={filterName}
          tagName={tagName}
          sortName={sortName}
          tags={tags}
          filterChange={this.onFilterChange}
          sortChange={this.onSortChange}
          tagChange={this.onTagChange}/>
      </main>
    );
  },

  onCategoryClicked(category){
    dispatch(navigateToCategory(category));
  },

  onFilterChange(filter){
    dispatch(navigateToFilter(filter));
  },

  onSortChange(sort) {
    dispatch(navigateToSort(sort));
  },

  onTagChange(tag){
    dispatch(navigateToTag(tag));
  },

  onCategoryUpdate(){
    const { categoryStore } = this.props;
    raf(() => this.setState((state) => _.extend(state, {
      categories: categoryStore.getCategories(),
      categoryName: categoryStore.getActiveCategoryName(),
    })));
  },

  onTagUpdate(){
    const { tagStore } = this.props;
    raf(() => this.setState((state) => _.extend(state, {
      tags: tagStore.getTags(),
      tagName: tagStore.getActiveTagName(),
    })));
  },

  onFilterUpdate(data){
    raf(() => this.setState((state) => _.extend(state, {
      filterName: data.filter,
    })));
  },

  onSortUpdate(data) {
    raf(() => this.setState((state) => _.extend(state, {
      sortName: data.sort,
    })));
  },

});
