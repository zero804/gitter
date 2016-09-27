import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import navigateToTag from '../../../action-creators/forum/navigate-to-tag';

export default React.createClass({

  displayName: 'ForumTagLink',
  propTypes: {
    className: PropTypes.string,
    onClick: PropTypes.func,
    groupUri: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    tag: PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }).isRequired,
  },

  render(){

    const {tag, groupUri, className} = this.props;
    const {label, value} = tag;
    const title = `View all ${label} topics`;
    const href = `/${groupUri}/topics?tag=${value}`;

    return (
      <a title={title}
         href={href}
         className={className}
         onClick={this.onClick}>
          {this.props.children}
      </a>
    );
  },

  onClick(e) {
    e.preventDefault();
    const {onClick, tag} = this.props;
    if(onClick) { return onClick(e, tag); }
    dispatch(navigateToTag(tag.value));
  }

});
