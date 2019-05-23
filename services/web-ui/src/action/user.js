import axios from 'axios';

export const GET_USERS = 'GET_USERS';
export const LOGIN = 'LOGIN';

const setAxiosAuth = (token) => {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const getUsers = () => async (dispatch) => {
    dispatch({
        type: GET_USERS,
        users: [
            {},
            {},
        ],
    });
};
export const login = data => async (dispatch) => {
    const result = await axios({
        method: 'post',
        url: '/login',
        data,
    });
    if (result.status === 200) {
        setAxiosAuth(result.data.token);
        dispatch({
            type: LOGIN,
            isLoggedIn: true,
            token: result.data.token,
        });
    }
};

export const logout = () => async (dispatch) => {
    const result = await axios({
        method: 'post',
        url: '/logout',
        withCredentials: true,
    });
    if (result.status === 200) {
        setAxiosAuth('');
        dispatch({
            type: LOGIN,
            isLoggedIn: false,
            token: '',
        });
    }
};
