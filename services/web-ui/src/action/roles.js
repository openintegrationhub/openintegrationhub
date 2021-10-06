import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_ROLES = 'GET_ROLES';
export const GET_PERMISSIONS = 'GET_GET_PERMISSIONS';
export const UPDATE_ROLE = 'UPDATE_ROLE';
export const CREATE_ROLE = 'CREATE_ROLE';
export const DELETE_ROLE = 'DELETE_ROLE';
export const ROLES_ERROR = 'ROLES_ERROR';
export const ROLES_ERROR_CLEAR = 'ROLES_ERROR_CLEAR';

export const getRoles = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.iam}/api/v1/roles`,
            withCredentials: true,
        });

        dispatch({
            type: GET_ROLES,
            roles: result.data,
        });
    } catch (error) {
        dispatch({
            type: ROLES_ERROR,
            error,
        });
    }
};
export const getPermissions = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.iam}/api/v1/permissions`,
            withCredentials: true,
        });

        dispatch({
            type: GET_PERMISSIONS,
            permissions: result.data,
        });
    } catch (error) {
        dispatch({
            type: ROLES_ERROR,
            error,
        });
    }
};

export const updateRole = (role) => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.iam}/api/v1/roles/${role._id}`,
            withCredentials: true,
            data: {
                name: role.name,
                description: role.description,
                permissions: role.permissions,
            },
        });

        dispatch({
            type: UPDATE_ROLE,
        });
        dispatch(getRoles());
    } catch (error) {
        dispatch({
            type: ROLES_ERROR,
            error,
        });
    }
};

export const createRole = (role) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.iam}/api/v1/roles`,
            withCredentials: true,
            data: {
                ...role,
            },
        });

        dispatch({
            type: CREATE_ROLE,
        });
        dispatch(getRoles());
    } catch (error) {
        dispatch({
            type: ROLES_ERROR,
            error,
        });
    }
};

export const deleteRole = (roleId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.iam}/api/v1/roles/${roleId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_ROLE,
        });
        dispatch(getRoles());
    } catch (error) {
        dispatch({
            type: ROLES_ERROR,
            error,
        });
    }
};

export const clearError = () => (dispatch) => {
    dispatch({
        type: ROLES_ERROR_CLEAR,
    });
};
