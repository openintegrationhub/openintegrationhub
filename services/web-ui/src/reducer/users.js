import { GET_USERS, UPDATE_USER, ERROR } from '../action/users';

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
    case ERROR:
        return {
            ...state,
            error: action.error,
        };
    default:
        return state;
    }
};
