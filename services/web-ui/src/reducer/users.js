import { GET_USERS, UPDATE_USER, UPDATE_USER_ERROR } from '../action/users';

const initialState = {
    all: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_USERS:
        return {
            ...state,
            error: null,
            all: [
                ...action.users,
            ],
        };
    case UPDATE_USER:
        return {
            ...state,
            error: null,
        };
    case UPDATE_USER_ERROR:
        return {
            ...state,
            error: action.err,
        };
    default:
        return state;
    }
};
