import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_COMPONENTS = 'GET_COMPONENTS';
export const GET_COMPONENTS_PAGE = 'GET_COMPONENTS_PAGE';
export const START_COMPONENT = 'START_COMPONENT';
export const STOP_COMPONENT = 'STOP_COMPONENT';
export const UPDATE_COMPONENT = 'UPDATE_COMPONENT';
export const UPDATE_COMPONENT_ERROR = 'UPDATE_COMPONENT_ERROR';
export const CREATE_COMPONENT = 'CREATE_COMPONENT';
export const DELETE_COMPONENT = 'DELETE_COMPONENT';

export const getComponents = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.component}/components`,
            withCredentials: true,
        });

        dispatch({
            type: GET_COMPONENTS,
            components: result.data.data,
            meta: result.data.meta,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getComponentsPage = (page) => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.component}/components?page[number]=${page}`,
            withCredentials: true,
        });

        dispatch({
            type: GET_COMPONENTS_PAGE,
            components: result.data.data,
            meta: result.data.meta,
        });
    } catch (err) {
        console.log(err);
    }
};

export const updateComponent = (component) => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.component}/components/${component.id}`,
            withCredentials: true,
            json: true,
            data: component,
        });

        dispatch({
            type: UPDATE_COMPONENT,
        });
        dispatch(getComponents());
    } catch (err) {
        dispatch({
            type: UPDATE_COMPONENT_ERROR,
            err,
        });
    }
};

export const startComponent = (component) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.component}/components/global/${component.id}/start`,
            withCredentials: true,
            json: true,
        });

        dispatch({
            type: START_COMPONENT,
        });
        dispatch(getComponents());
    } catch (err) {
        console.log(err);
    }
};

export const stopComponent = (component) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.component}/components/global/${component.id}/stop`,
            withCredentials: true,
            json: true,
        });

        dispatch({
            type: STOP_COMPONENT,
        });
        dispatch(getComponents());
    } catch (err) {
        console.log(err);
    }
};

export const createComponent = (data) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.component}/components`,
            withCredentials: true,
            json: true,
            data,
        });

        dispatch({
            type: CREATE_COMPONENT,
        });
        dispatch(getComponents());
    } catch (err) {
        console.log(err);
    }
};

export const deleteComponent = (componentId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.component}/components/${componentId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_COMPONENT,
        });
        dispatch(getComponents());
    } catch (err) {
        console.log(err);
    }
};
