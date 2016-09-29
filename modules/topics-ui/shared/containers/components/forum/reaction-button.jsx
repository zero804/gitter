import React, { PropTypes } from 'react';
import RawReactionButton from './raw-reaction-button.jsx';

export default React.createClass({

  displayName: 'ReactionButton',
  propTypes: {
    className: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    onReactionPick: PropTypes.func
  },

  getInitialState() {
    return {
      // TODO: Remove. This is a dirty place-holder that flip-flops between reacting and not reacting
      // This will be supersceded by actual state whether the user already has a reaction of that type, etc
      tempIsAlreadyReacting: false
    };
  },

  render() {
    const { children, className } = this.props;

    return (
      <RawReactionButton
        className={className}
        children={children}
        onBlur={this.onBlur}
        onReactionPick={this.onReactionPick} />
    );
  },

  onReactionPick(reactionKey) {
    const { onReactionPick } = this.props;
    const { tempIsAlreadyReacting } = this.state;
    const newTempIsAlreadyReacting = !tempIsAlreadyReacting;

    if(onReactionPick) {
      onReactionPick(reactionKey, newTempIsAlreadyReacting);
    }

    this.setState({
      // Update our dirty property to flip-flop next time
      tempIsAlreadyReacting: newTempIsAlreadyReacting
    });
  }

});
