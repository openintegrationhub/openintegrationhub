import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_USERS = 'GET_USERS';
export const UPDATE_USER = 'UPDATE_USER';
export const CREATE_USER = 'CREATE_USER';
export const DELETE_USER = 'DELETE_USER';
export const USERS_ERROR = 'USERS_ERROR';
export const USERS_ERROR_CLEAR = 'USERS_ERROR_CLEAR';

export const getUsers = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.iam}/api/v1/users`,
            withCredentials: true,
        });

        dispatch({
            type: GET_USERS,
            users: result.data,
        });
    } catch (error) {
        dispatch({
            type: USERS_ERROR,
            error,
        });
    }
};

export const updateUser = (user) => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.iam}/api/v1/users/${user._id}`,
            withCredentials: true,
            data: user,
        });

        dispatch({
            type: UPDATE_USER,
        });
        dispatch(getUsers());
    } catch (error) {
        dispatch({
            type: USERS_ERROR,
            error,
        });
    }
};

export const createUser = (user) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.iam}/api/v1/users`,
            withCredentials: true,
            data: {
                ...user,
            },
        });

        dispatch({
            type: CREATE_USER,
        });
        dispatch(getUsers());
    } catch (error) {
        dispatch({
            type: USERS_ERROR,
            error,
        });
    }
};

export const deleteUser = (userId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.iam}/api/v1/users/${userId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_USER,
        });
        dispatch(getUsers());
    } catch (error) {
        dispatch({
            type: USERS_ERROR,
            error,
        });
    }
};

export const clearError = () => (dispatch) => {
    dispatch({
        type: USERS_ERROR_CLEAR,
    });
};
