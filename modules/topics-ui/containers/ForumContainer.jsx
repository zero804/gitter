'use strict';

var React = require('react');
var CategoryList = require('../shared/components/forum/category-list.jsx');
var {subscribe, unsubscribe, dispatch} = require('../browser/js/dispatcher');
var navigateToCategory = require('../browser/js/action-creators/forum/navigate-to-category');
var forumCatConstants = require('../browser/js/constants/forum-categories');

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    groupName: React.PropTypes.string.isRequired,
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    }).isRequired
  },

  getInitialState(){
    const { categoryStore } = this.props;
    return {
      categories: categoryStore.getCategories()
    };
  },

  componentDidMount(){
    subscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  componentWillUnmount(){
    unsubscribe(forumCatConstants.UPDATE_ACTIVE_CATEGORY, this.onCategoryUpdate, this);
  },

  render() {
    const { categories } = this.state;
    const { groupName } = this.props;
    return (
      //Search header ...
      <CategoryList
        categories={ categories }
        groupName={ groupName }
        onCategoryClicked={ this.onCategoryClicked } />
    );
  },

  onCategoryClicked(category){
    //TODO Replace payload generation with an action-creator
    dispatch(navigateToCategory(category));
  },

  onCategoryUpdate(){
    const { categoryStore } = this.props;
    this.setState({
      categories: categoryStore.getCategories()
    })
  }

});
