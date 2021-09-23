import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import InputLabel from '@material-ui/core/InputLabel';
import {
    Add, NavigateNext, NavigateBefore,
} from '@material-ui/icons';
import Modal from '@material-ui/core/Modal';
import AddSecret from './add-secret';
// components
import SecretTeaser from './secret-teaser';

import * as secretsActions from '../../action/secrets';
import * as authClientsActions from '../../action/auth-clients';

const useStyles = {

    wrapper: {
        padding: '20px 0',
        justifyContent: 'center',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
    },

};

class Secrets extends React.Component {
    state = {
        showAddSecret: false,
        processingAuth: false,
    }

    constructor(props) {
        super();
        props.getSecrets();
        props.getClients();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.authClients.authUrl !== this.props.authClients.authUrl) {
            window.location.href = this.props.authClients.authUrl;
        }
    }

    addSecret = () => {
        this.setState({
            showAddSecret: true,
        });
    };

    prePage = () => {
        if (this.props.secrets.meta.page === 1) {
            this.props.getSecretsPage(this.props.secrets.meta.totalPages);
        } else {
            this.props.getSecretsPage(this.props.secrets.meta.page - 1);
        }
    };

    nextPage = () => {
        if (this.props.secrets.meta.page === this.props.secrets.meta.totalPages) {
            this.props.getSecretsPage(1);
        } else {
            this.props.getSecretsPage(this.props.secrets.meta.page + 1);
        }
    };

    closeModal = () => {
        this.setState({
            showAddSecret: false,
        });
    }

    startFlow = (id) => {
        const scope = '';
        this.props.processAuth(id, {
            ...(scope ? { scope } : {}),
            successUrl: '/secrets',
        });

        this.setState({
            processingAuth: true,
        });
    }

    addMixed = (data) => {
        this.props.createMixedSecret({ data });
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid container spacing={2}>

                    <Grid item xs={6}>
                        <Button variant="outlined" aria-label="Add" onClick={this.addSecret}>
                            Add<Add />
                        </Button>
                    </Grid>
                    {this.props.secrets.meta && <Grid item xs={6}>
                        <Grid container justify="flex-end" spacing={2}>
                            <Grid item>
                                <InputLabel>Secrets: </InputLabel>{this.props.secrets.meta.total}
                            </Grid>
                            <Grid item>
                                <Button variant="outlined" aria-label="before" onClick={this.prePage} >
                                    <NavigateBefore />
                                </Button>
                            </Grid>
                            <Grid item>
                                {this.props.secrets.meta.page}/{this.props.secrets.meta.totalPages}
                            </Grid>
                            <Grid item>
                                <Button variant="outlined" aria-label="next" onClick={this.nextPage}>
                                    <NavigateNext />
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>}

                </Grid>
                <Grid container justify="center" spacing={2}>
                    {
                        this.props.secrets.secrets.length && this.props.secrets.secrets.map((item) => <SecretTeaser
                            key={`secretTeaser-${item._id}`}
                            data={item}
                            provider={item.value && item.value.authClientId ? (this.props.authClients.available.find((client) => client._id === item.value.authClientId) || {}) : {}}
                            deleteSecret={() => { this.props.deleteSecret(item._id); }}
                        />)
                    }
                </Grid>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.showAddSecret}
                    onClose={() => { this.setState({ showAddSecret: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <AddSecret
                            startFlow={this.startFlow}
                            addMixed={this.addMixed}
                            authClients={this.props.authClients}
                            close={this.closeModal}
                        />
                    </div>
                </Modal>
            </Container >
        );
    }
}

const mapStateToProps = (state) => ({
    secrets: state.secrets,
    authClients: state.authClients,
    auth: state.auth,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    ...secretsActions,
    ...authClientsActions,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Secrets);
