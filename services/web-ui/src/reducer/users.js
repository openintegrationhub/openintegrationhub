import {
    GET_USERS, UPDATE_USER, USERS_ERROR, USERS_ERROR_CLEAR,
} from '../action/users';

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
    case USERS_ERROR:
        return {
            ...state,
            error: action.error,
        };
    case USERS_ERROR_CLEAR:
        return {
            ...state,
            error: null,
        };
    default:
        return state;
    }
};
