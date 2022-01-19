import axios from 'axios';
import { getConfig } from '../conf';

const conf = getConfig();

export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const GET_USER = 'GET_USER';
export const RESET = 'RESET';
export const CHECK = 'CHECK';

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

export const login = (data) => async (dispatch) => {
    const result = await axios({
        method: 'post',
        url: `${conf.endpoints.iam}/login`,
        data,
    });
    if (result.status === 200) {
        setAxiosAuth(result.data.token);
        sessionStorage.setItem('oihToken', result.data.token);
        dispatch({
            type: LOGIN,
            isLoggedIn: true,
            token: result.data.token,
        });
        dispatch(getUser());
    }
};

export const resetLogin = () => async (dispatch) => {
    dispatch({
        type: RESET,
        isLoggedIn: false,
        token: '',
    });
    sessionStorage.removeItem('oihToken');
};

export const checkLogin = () => (dispatch) => {
    const result = sessionStorage.getItem('oihToken');
    if (result) {
        setAxiosAuth(result);
        dispatch({
            type: CHECK,
            isLoggedIn: true,
            token: result,
        });
        dispatch(getUser());
    } else {
        dispatch({
            type: LOGOUT,
            isLoggedIn: false,
            token: '',
        });
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
        sessionStorage.removeItem('oihToken');
        dispatch({
            type: LOGOUT,
            isLoggedIn: false,
            token: '',
        });
    }
};
