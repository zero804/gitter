'use strict';

import React from 'react';
import Dispatcher from '../browser/js/dispatcher';

import CategoryList from '../shared/components/forum/category-list.jsx';
import TableControl from '../shared/components/forum/table-control.jsx';

import navConstants from '../browser/js/constants/navigation';
import forumCatConstants from '../browser/js/constants/forum-categories';

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    groupName: React.PropTypes.string.isRequired,
    categoryName: React.PropTypes.string.isRequired,
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    }).isRequired
  },

  getInitialState(){
    const { categoryStore } = this.props;
    return {
      categories: categoryStore.getCategories(),
      categoryName: this.props.categoryName,
    };
  },

  componentDidMount(){
    const { categoryStore } = this.props;
    Dispatcher.on(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  componentWillUnmount(){
    Dispatcher.off(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  render() {
    const { categories, categoryName } = this.state;
    const { groupName } = this.props;
    return (
      <main>
        <CategoryList
          categories={ categories }
          groupName={ groupName }
          onCategoryClicked={ this.onCategoryClicked } />

        <TableControl
          groupName={groupName}
          category={categoryName}/>
      </main>
    );
  },

  onCategoryClicked(category){
    //TODO Replace payload generation with an action-creator
    Dispatcher.trigger(navConstants.NAVIGATE_TO, {
      route: 'forum',
      category: category,
    });
  },

  onCategoryUpdate(data){
    const { categoryStore } = this.props;
    this.setState({
      categories: categoryStore.getCategories(),
      ////FIXME
      //Consider moving this out of the event payload and provide
      //categoryStore.getActiveCategoryName() to get this
      categoryName: data.category,
    })
  }

});
