import { combineReducers } from 'redux';
import auth from './auth';
import users from './users';
import tenants from './tenants';
import flows from './flows';
import { LOGOUT } from '../action/auth';

const appReducer = combineReducers({
    users,
    tenants,
    auth,
    flows,
});

export default (state, action) => {
    if (action.type === LOGOUT) {
        state = undefined; // eslint-disable-line no-param-reassign
    }

    return appReducer(state, action);
};
