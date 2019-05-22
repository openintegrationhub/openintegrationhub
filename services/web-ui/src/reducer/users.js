import { GET_USERS } from '../action/users';

const initialState = {
    all: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_USERS:
        return {
            all: action.users,
        };
    default:
        return state;
    }
};
