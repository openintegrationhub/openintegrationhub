import {
    LOGIN, LOGOUT, RESET, GET_USER, CHECK,
} from '../action/auth';

const initialState = {
    isLoggedIn: false,
    token: '',
    isAdmin: false,
    isTenantAdmin: false,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case LOGIN:
        return {
            ...state,
            isLoggedIn: action.isLoggedIn,
            token: action.token,
        };
    case LOGOUT:
        return {
            ...initialState,
        };
    case RESET:
        return {
            ...initialState,
        };
    case CHECK:
        return {
            ...state,
            isLoggedIn: action.isLoggedIn,
            token: action.token,
        };
    case GET_USER:
        return {
            ...state,
            ...action.user,
            isAdmin: action.user.permissions && action.user.permissions.includes('all'),
            isTenantAdmin: action.user.permissions && action.user.permissions.includes('tenant.all'),
        };
    default:
        return state;
    }
};
