import { GET_USERS, LOGIN } from '../action/user';

const initialState = {
    isLoggedIn: false,
    token: '',
    all: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_USERS:
        return {
            ...state,
            all: action.users,
        };
    case LOGIN:
        return {
            ...state,
            isLoggedIn: action.isLoggedIn,
            token: action.token,
        };
    default:
        return state;
    }
};
