import { equal } from 'assert';
import { shallow } from 'enzyme';
import {subscribe} from '../../../../shared/dispatcher';
import CreateTopicContainer from '../../../../shared/containers/CreateTopicContainer.jsx';

describe.only('<CreateTopicContainer />', () => {

  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<CreateTopicContainer />);
  });

  it('should render the create topic modal', () => {
    equal(wrapper.find('CreateTopicModal').length, 1);
  });

});
