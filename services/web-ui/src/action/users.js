export const GET_USERS = 'GET_USERS';

export const getUsers = () => async (dispatch) => {
    dispatch({
        type: GET_USERS,
        users: [
            {},
            {},
        ],
    });
};
