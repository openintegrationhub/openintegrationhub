import axios from 'axios';
import { getConfig } from '../conf';

const conf = getConfig();

export const LOGIN = 'LOGIN';

const setAxiosAuth = (token) => {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
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
            type: LOGIN,
            isLoggedIn: false,
            token: '',
        });
    }
};
