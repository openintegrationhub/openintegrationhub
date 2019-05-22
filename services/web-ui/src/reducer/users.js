import { GET_USERS, LOGIN } from '../action/users';

const initialState = {
    isLoggedIn: false,
    token: '',
    all: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_USERS:
        return {
            all: action.users,
        };
    case LOGIN:
        return {
            isLoggedIn: action.users,
        };
    default:
        return state;
    }
};
