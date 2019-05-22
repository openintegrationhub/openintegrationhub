export const GET_USERS = 'GET_USERS';
export const LOGIN = 'LOGIN';

export const getUsers = () => async (dispatch) => {
    dispatch({
        type: GET_USERS,
        users: [
            {},
            {},
        ],
    });
};
export const login = () => async (dispatch) => {
    dispatch({
        type: LOGIN,
        isLoggedIn: true,
    });
};
