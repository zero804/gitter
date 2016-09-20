import React, { PropTypes } from 'react';
import toggleForumWatchState from '../../../action-creators/forum/toggle-forum-watch-state';
import {dispatch} from '../../../dispatcher';

export default React.createClass({

  displayName: 'WatchForumLink',

  propTypes: {
    forumId: PropTypes.string.isRequired,
    children: PropTypes.node,
    onClick: PropTypes.func,
    className: PropTypes.string,
    href: PropTypes.string,
    isWatching: PropTypes.bool,
  },

  render(){

    const {children, className, href, isWatching} = this.props;

    var watchText = isWatching ? 'Unfollow' : 'Follow';

    return (
      <a
        title={watchText}
        href={href}
        className={className}
        onClick={this.onClick}>
        {children || watchText}
      </a>
    );
  },


  onClick(e){
    e.preventDefault();
    const {forumId, onClick} = this.props;
    if(onClick) { return onClick(...arguments); }
    dispatch(toggleForumWatchState(forumId));
  }

});
