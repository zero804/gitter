import React, { PropTypes } from 'react';
import navigateToCategory from '../../../action-creators/forum/navigate-to-category';
import {dispatch} from '../../../dispatcher';
import {DEFAULT_CATEGORY_NAME} from '../../../constants/navigation';

export default React.createClass({

  displayName: 'ForumCategoryLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupName: PropTypes.string.isRequired,
    category: PropTypes.shape({
      category: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
    onClick: PropTypes.func,
    className: PropTypes.string
  },

  render(){

    const {category, groupName, className} = this.props;
    const { slug } = category;
    //TODO, should do something about this
    const categoryName = category.category;
    const title = `View all ${categoryName} topics`;
    const href = (categoryName === DEFAULT_CATEGORY_NAME) ?
      `/${groupName}/topics` :
      `/${groupName}/topics/categories/${slug}`;

    return (
      <a title={title} href={href} className={className} onClick={this.onClick}>{this.props.children}</a>
    );
  },

  onClick(e){
    e.preventDefault();
    const {onClick, category} = this.props;
    if(onClick) { return onClick(e, category); }
    dispatch(navigateToCategory(category.slug));
  }

});
