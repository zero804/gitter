import React, { PropTypes } from 'react';
import IconButton from '../buttons/icon-button.jsx';

import * as reactionConstants from '../../../constants/reactions';
import {ICONS_LIKE, ICONS_LIKE_SELECTED} from '../../../constants/icons';

export default React.createClass({

  displayName: 'RawReactionButton',
  propTypes: {
    className: PropTypes.string,
    ownStateClassName: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
    reactionCountMap: PropTypes.object,
    ownReactionMap: PropTypes.object,
    onReactionPick: PropTypes.func
  },

  getDefaultProps() {
    return {
      reactionCountMap: {},
      ownReactionMap: {}
    };
  },

  render() {
    const { children, className, ownStateClassName, reactionCountMap, ownReactionMap } = this.props;

    const likeReactionCount = reactionCountMap[reactionConstants.LIKE] || 0;


    const type = ownReactionMap[reactionConstants.LIKE] ?
    ICONS_LIKE_SELECTED :
    ICONS_LIKE ;

    return (
      <IconButton
        type={type}
        onClick={this.onClick}>
        {children || likeReactionCount}
      </IconButton>
    );
  },

  onClick(e) {
    this.onReactionClick(reactionConstants.LIKE);
    e.preventDefault();
  },

  onReactionClick(reactionKey) {
    const { onReactionPick } = this.props;
    if(onReactionPick) {
      onReactionPick(reactionKey);
    }
  }

});
