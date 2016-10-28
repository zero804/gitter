import React, { PropTypes } from 'react';
import SearchHeader from './search-header.jsx';

export default React.createClass({

  displayName: 'SearchHeaderContainer',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    groupName: PropTypes.string,
    groupAvatarUrl: PropTypes.string,
  },

  render(){
    const {groupUri, groupName, groupAvatarUrl } = this.props;

    return (
      <SearchHeader
        groupUri={groupUri}
        groupName={groupName}
        groupAvatarUrl={groupAvatarUrl}/>
    );
  }

});
