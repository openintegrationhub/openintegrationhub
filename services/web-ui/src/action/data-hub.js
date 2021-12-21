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

// plain requests

export const enrichData = async () => {
    try {
        const result = await axios({
            method: 'post',
            url: `${conf.endpoints.dataHub}/data/enrich`,
            data: {
                functions: [
                    {
                        name: 'score',
                        active: true,
                        fields: [
                            {
                                key: 'firstName',
                                minLength: 5,
                                weight: 1,
                            },
                            {
                                key: 'lastName',
                                minLength: 5,
                                weight: 1,
                            },
                            {
                                key: 'jobTitle',
                                minLength: 5,
                                weight: 2,
                            },
                            {
                                key: 'description',
                                minLength: 5,
                                weight: 2,
                            },
                        ],
                    },
                    {
                        name: 'tag',
                        active: true,
                        fields: [
                            {
                                comparator: 'hasField',
                                tag: 'Has a Name',
                                additive: true,
                                arguments: {
                                    field: 'firstName',

                                },
                            },
                            {
                                comparator: 'hasField',
                                tag: 'Has a LastName',
                                additive: true,
                                arguments: {
                                    field: 'lastName',

                                },
                            },
                        ],
                    },
                    {
                        name: 'tag',
                        active: true,
                        fields: [
                            {
                                comparator: 'fieldEquals',
                                tag: 'Is a James',
                                additive: true,
                                arguments: {
                                    field: 'firstName',
                                    targetValue: 'James',
                                },
                            },
                        ],
                    },
                ],
            },
            withCredentials: true,
        });

        console.log(result);
    } catch (err) {
        console.log(err);
    }
};
