import { combineReducers } from 'redux';
import auth from './auth';
import users from './users';
import tenants from './tenants';

export default combineReducers({
    users,
    tenants,
    auth,
});
