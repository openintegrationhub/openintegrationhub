import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import configureStore from './store';

global.configureStore = configureStore;

configure({ adapter: new Adapter() });
