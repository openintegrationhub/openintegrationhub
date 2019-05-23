import { GET_USERS } from '../action/users';

const initialState = [];

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_USERS:
        return [
            ...action.users,
        ];
    default:
        return state;
    }
};
