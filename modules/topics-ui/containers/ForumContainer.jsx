'use strict';

var React = require('react');
var CategoryList = require('../shared/components/forum/category-list.jsx');

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    }).isRequired
  },

  render() {
    const categories = this.props.categoryStore.getCategories();
    return (
      //Search header ...
      <CategoryList categories={categories} />
    );
  }
});
