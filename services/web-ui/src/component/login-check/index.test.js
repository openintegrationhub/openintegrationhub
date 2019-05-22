import { Provider } from 'react-redux';

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';
import mock from 'xhr-mock';
import { OidcProvider } from 'redux-oidc';
import Container from '.';
import store from '../../../../../shared/store/configureStore';
import userManager from '../../../util/user-manager';

describe('<Container />', () => {

    beforeEach(() => mock.setup());
    afterEach(() => mock.teardown());
    
    it('calls rendered', () => {

        mount(  
            <Provider store={store}>
                <OidcProvider store={store} userManager={userManager}>
                    <MemoryRouter initialEntries={['/']}>
                        <Container/>
                    </MemoryRouter>
                </OidcProvider>
            </Provider>          
        );

        expect(true).toBe(true);
    });
});
