import { LOGIN, GET_USER } from '../action/auth';

const initialState = {
    isLoggedIn: false,
    token: '',
};

export default (state = initialState, action) => {
    switch (action.type) {
    case LOGIN:
        return {
            ...state,
            isLoggedIn: action.isLoggedIn,
            token: action.token,
        };
    case GET_USER:
        return {
            ...state,
            ...action.user,
        };
    default:
        return state;
    }
};
