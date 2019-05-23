import { combineReducers } from 'redux';
import auth from './auth';
import users from './users';

export default combineReducers({
    users,
    auth,
});
