import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_DATA_OBJECTS = 'GET_DATA_OBJECTS';

export const getDataObjects = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.dataHub}/data`,
            withCredentials: true,
        });

        const { data, meta } = result.data;
        dispatch({
            type: GET_DATA_OBJECTS,
            meta,
            data,
        });
    } catch (err) {
        console.log(err);
    }
};
