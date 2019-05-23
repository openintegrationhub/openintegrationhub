import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { updateConfig } from './conf';
import configureStore from './store';

const initialState = {
    auth: {
        isLoggedIn: true,
    },
};

// setup config
updateConfig(require('../server/conf'));

// setup global redux store
global.configureStore = (state = initialState) => configureStore(state);

configure({ adapter: new Adapter() });
