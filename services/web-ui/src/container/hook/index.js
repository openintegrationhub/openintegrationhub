import React from 'react';
import { connect } from 'react-redux';
import qs from 'qs';
import { bindActionCreators } from 'redux';
import * as authClientsActions from '../../action/auth-clients';

// oidc callback page
class Hook extends React.Component {
    componentDidMount() {
        const query = qs.parse(window.location.search.slice(1));
        if (query.code && query.state) {
            this.props.processCallback(query);
        }
    }

    render() {
        if (this.props.authClients.processedCallback && this.props.authClients.successUrl !== '') {
            return (
                <div>
                    {this.props.history.push(this.props.authClients.successUrl)}
                </div>
            );
        }
        return (
            <div>
                Please wait ...
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    authClients: state.authClients,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
    ...authClientsActions,
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(Hook);
