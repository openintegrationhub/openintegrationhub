import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import configureStore from './store';

const initialState = {
    auth: {
        isLoggedIn: true,
    },
};

global.configureStore = (state = initialState) => configureStore(state);

configure({ adapter: new Adapter() });
