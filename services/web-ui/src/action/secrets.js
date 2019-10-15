import axios from 'axios';

export const GET_SECRET = 'GET_SECRET';
export const GET_SECRETS = 'GET_SECRETS';

export const getSecret = secretId => async (dispatch) => {
    try {
        const { data } = (await axios({
            method: 'get',
            url: `/user/secrets/${secretId}`,
            withCredentials: true,
        })).data;
        dispatch({
            type: GET_SECRET,
            config: data,
        });
    } catch (err) {
        console.log(err);
    }
};


export const getSecrets = () => async (dispatch) => {
    try {
        const { data } = (await axios({
            method: 'get',
            url: '/user/secrets',
            withCredentials: true,
        })).data;

        dispatch({
            type: GET_SECRETS,
            data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const deleteSecret = secretId => async (dispatch) => {
    try {
        const { status } = await axios({
            method: 'delete',
            url: `/integrated-apps/secrets/${secretId}`,
            withCredentials: true,
        });
        if (status === 204) {
            await axios({
                method: 'delete',
                url: `/user/secrets/${secretId}`,
                withCredentials: true,
            });
            dispatch(getSecrets());
        } else {
            console.log('Error on delete Secret :', status);
        }
    } catch (err) {
        console.log(err);
    }
};
