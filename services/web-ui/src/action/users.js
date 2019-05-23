import axios from 'axios';

export const GET_USERS = 'GET_USERS';

export const getUsers = () => async (dispatch) => {
    const result = await axios({
        method: 'get',
        url: '/api/v1/users',
        withCredentials: true,
    });

    dispatch({
        type: GET_USERS,
        users: result.data,
    });
};
