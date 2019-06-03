import axios from 'axios';
import { getConfig } from '../conf';

const conf = getConfig();

export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const GET_USER = 'GET_USER';

const setAxiosAuth = (token) => {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const getUser = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.iam}/api/v1/users/me`,
            withCredentials: true,
        });

        dispatch({
            type: GET_USER,
            user: result.data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const login = data => async (dispatch) => {
    const result = await axios({
        method: 'post',
        url: `${conf.endpoints.iam}/login`,
        data,
    });
    if (result.status === 200) {
        setAxiosAuth(result.data.token);
        dispatch({
            type: LOGIN,
            isLoggedIn: true,
            token: result.data.token,
        });
        dispatch(getUser());
    }
};


export const logout = () => async (dispatch) => {
    const result = await axios({
        method: 'post',
        url: `${conf.endpoints.iam}/logout`,
        withCredentials: true,
    });
    if (result.status === 200) {
        setAxiosAuth('');
        dispatch({
            type: LOGOUT,
            isLoggedIn: false,
            token: '',
        });
    }
};
