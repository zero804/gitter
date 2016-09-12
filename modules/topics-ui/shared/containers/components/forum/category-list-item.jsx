import React, {PropTypes, createClass} from 'react';
import ForumCategoryLink from '../links/forum-category-link.jsx';

export default createClass({
  displayName: 'CategoryListItem',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    category: PropTypes.shape({
      active: PropTypes.bool.isRequired,
    }).isRequired,
  },

  shouldComponentUpdate(nextProps) {
    const {active} = this.props.category;
    return active !== nextProps.active;
  },

  render() {
    const { category, groupName } = this.props;
    const {active} = category;

    let className = 'category-list__item';
    if(active) { className = 'category-list__item--active'; }

    return (
      <ForumCategoryLink
        className={className}
        groupName={groupName}
        category={category}>
        {category.category}
      </ForumCategoryLink>
    );
  },

});
