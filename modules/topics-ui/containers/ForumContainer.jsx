'use strict';

import React from 'react';
import {subscribe, unsubscribe, dispatch} from '../browser/js/dispatcher';

import CategoryList from '../shared/components/forum/category-list.jsx';
import ForumTableControl from '../shared/components/forum/table-control.jsx';

import navigateToCategory from '../browser/js/action-creators/forum/navigate-to-category';
import navigateToFilter from '../browser/js/action-creators/forum/navigate-to-filter';
import navigateToSort from '../browser/js/action-creators/forum/navigate-to-sort';
import navigateToTag from '../browser/js/action-creators/forum/navigate-to-tag';

import forumCatConstants from '../browser/js/constants/forum-categories';

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    groupName: React.PropTypes.string.isRequired,
    //Categories ---
    categoryName: React.PropTypes.string.isRequired,
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

  getInitialState(){
    const { categoryStore, tagStore } = this.props;
    return {
      categories: categoryStore.getCategories(),
      categoryName: this.props.categoryName,
      tags: tagStore.getTags()
    };
  },

  componentDidMount(){
    const { categoryStore } = this.props;
    subscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  componentWillUnmount(){
    unsubscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  render() {
    const { categories, categoryName, tags } = this.state;
    const { groupName } = this.props;
    return (
      <main>
        <CategoryList
          categories={ categories }
          groupName={ groupName }
          //Change this attribute name to categoryChange
          onCategoryClicked={ this.onCategoryClicked } />

        <ForumTableControl
          groupName={groupName}
          category={categoryName}
          filterChange={this.onFilterChange}
          sortChange={this.onSortChange}
          tagChange={this.onTagChange}
          tags={tags}/>
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
    //TODO --> you can get the current state with setState((state) =>)
    //use that and extend the payload with these new values
    this.setState({
      categories: categoryStore.getCategories(),
      categoryName: categoryStore.getActiveCategoryName(),
    })
  }

});
