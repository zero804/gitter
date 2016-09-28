import React, {PropTypes, createClass} from 'react';
import ForumCategoryLink from '../links/forum-category-link.jsx';

export default createClass({
  displayName: 'CategoryListItem',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    category: PropTypes.shape({
      active: PropTypes.bool.isRequired,
    }).isRequired,
  },

  shouldComponentUpdate(nextProps) {
    const {active} = this.props.category;
    return active !== nextProps.active;
  },

  render() {
    const { category, groupUri } = this.props;
    const {active} = category;

    let className = 'category-list__item';
    if(active) { className = 'category-list__item--active'; }

    return (
      <ForumCategoryLink
        className={className}
        groupUri={groupUri}
        category={category}>
        {category.category}
      </ForumCategoryLink>
    );
  },

});
