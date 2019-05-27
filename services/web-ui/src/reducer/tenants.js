import { GET_TENANTS } from '../action/tenants';

const initialState = [];

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_TENANTS:
        return [
            ...action.users,
        ];
    default:
        return state;
    }
};
