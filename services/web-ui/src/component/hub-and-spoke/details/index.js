import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
// import { Close as CloseIcon } from '@material-ui/icons';

// Actions
import {
    FormControl,
    Container,
    TextField, InputLabel, Select, MenuItem,
} from '@material-ui/core';
import Modal from '@material-ui/core/Modal';
import {
    getSecrets,
} from '../../../action/secrets';
import {
    getApps,
} from '../../../action/app-directory';
import { getDomains, getDomainSchemas } from '../../../action/metadata';
import {
    getDispatcherConfig, updateDispatcherConfig,
} from '../../../action/hub-spoke';
import AppTeaser from '../../app-directory/app-teaser';

const useStyles = {
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
        padding: '30px',
    },
    wrapper: {
        paddingTop: '20px',
        justifyContent: 'center',
    },
    formControl: {
        margin: '10px',
        minWidth: 120,
    },
    hubWrapper: {
        display: 'flex',
        minWidth: 240,
        minHeight: 480,
    },
    hub: {
        width: '20%',
        height: '100%',
        minWidth: 120,
        backgroundColor: '#ffba89',

        minHeight: '400px',
        marginBottom: '20px',
        marginRight: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2em',
    },
    connectedApps: {
        flex: '2',
    },
    addNewApp: {
        marginTop: '20px',
    },
    connectedAppContainer: {
        display: 'flex',
    },
    direction: {
        display: 'block',
        opacity: 0.2,
    },
    directionActive: {
        opacity: 1,
    },
    secretsWrapper: {
        width: '300px',
    }
};

class DispatcherConfigDetails extends React.Component {
    state = {
        hasChanges: false,
        entity: {
            name: '',
            applications: [],
        },
    }

    async componentDidMount() {
        try {
            await this.props.getApps();
            await this.props.getDomains();
            await this.props.getSecrets();
            for (const domain of this.props.dataModels) {
                this.props.getDomainSchemas(domain.id);
            }
            const entity = await getDispatcherConfig(this.props.match.params.id);
            this.setState({
                entity: {
                    ...this.state.entity,
                    ...entity,
                },
            });
        } catch (e) {
            console.error(e);
        }
    }

    setEntityVal = (fieldName, e) => {
        let val = e.target.value;
        if (fieldName === 'isGlobal') {
            val = e.target.checked;
        }
        this.setState({
            app: {
                ...this.state.app,
                [fieldName]: val,
            },
            hasChanges: true,
        });
    }

    handleEntityUpdate = async (e) => {
        e.preventDefault();

        if (!this.state.hasChanges) {
            return;
        }

        try {
            const resp = await updateDispatcherConfig(this.state.entity.id, { ...this.state.entity });
            this.setState({
                hasChanges: 0,
                entity: {
                    ...this.state.entity,
                    ...resp,
                },
            });
        } catch (err) {
            console.error(err);
        }
    }

    toggleAddApp = () => {
        this.setState({
            addApp: true,
        });
    }

    toggleDirectionForApp = async (appId, direction) => {
        const applications = [...this.state.entity.applications];
        const app = applications.find(_app => _app._id === appId);
        app[direction].active = !app[direction].active;

        this.setState({
            entity: {
                ...this.state.entity,
                applications,
            },
            hasChanges: 1,
        });
    }

    getAppFlowsForDirection = (app, direction) => {
        if (direction === 'inbound') {
            let inboundConnections = [];
            app.syncMappings.filter(map => map.direction === 'inbound').forEach((entry) => {
                inboundConnections = inboundConnections.concat(entry.actionTypes.map(singleEntry => ({
                    transformerAction: entry.transformerOperation,
                    adapterAction: entry.adapterOperation,
                    schemaUri: entry.dataModels[0],
                    operation: singleEntry,
                })));
            });
            return {
                active: true,
                flows: inboundConnections,
            };
        }
        return {
            active: true,
            flows: app.syncMappings.filter(map => map.direction === 'outbound').map(entry => ({
                transformerAction: entry.transformerOperation,
                adapterAction: entry.adapterOperation,
                schemaUri: entry.dataModels[0],
            })),
        };
    }

    addApp = async (appId) => {
        const app = this.props.apps.list.find(_app => _app._id === appId);
        const applications = [...this.state.entity.applications];
        const newApp = {
            applicationName: app.name,
            applicationUid: app.artifactId,
            adapterComponentId: app.components && app.components.adapter,
            transformerComponentId: app.components && app.components.transformer,

            inbound: this.getAppFlowsForDirection(app, 'inbound'),

            outbound: this.getAppFlowsForDirection(app, 'outbound'),
        };

        applications.push(newApp);
        this.setState({
            addApp: false,
            entity: {
                ...this.state.entity,
                applications,
            },
            hasChanges: 1,
        });
    }

    removeApp = async (index) => {
        const applications = [...this.state.entity.applications];

        applications.splice(index, 1);

        this.setState({
            addApp: false,
            entity: {
                ...this.state.entity,
                applications,
            },
            hasChanges: 1,
        });
    }

    setSecretForApp = (appId, e) => {
        console.log(appId, e.target.value);
        const applications = [...this.state.entity.applications];

        const app = applications.find(_app => _app._id === appId);
        app.secretId = e.target.value;

        this.setState({
            addApp: false,
            entity: {
                ...this.state.entity,
                applications,
            },
            hasChanges: 1,
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid item xs={12}>

                    <Modal
                        aria-labelledby="simple-modal-title"
                        aria-describedby="simple-modal-description"
                        open={this.state.addApp}
                        onClose={ () => { this.setState({ addApp: false }); }}
                        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                    >
                        <div className={classes.modal}>
                            <Grid container justify="center" spacing={2}>
                                {this.props.apps.list.map(app => <AppTeaser key={app._id} {...app} hideControls={true} onClick={this.addApp.bind(this)} />)}
                            </Grid>

                        </div>

                    </Modal>

                    <form onSubmit={this.handleEntityUpdate.bind(this)}>

                        <FormControl fullWidth className={classes.margin}>
                            <TextField
                                id="name"
                                label="Name"
                                className={classes.textField}
                                value={this.state.entity.name}
                                onChange={this.setEntityVal.bind(this, 'name')}
                                margin="normal"
                                required
                            />
                        </FormControl>

                        <div className={classes.hubWrapper}>
                            <div className={classes.hub}>OIH HUB</div>
                            <div className={classes.connectedApps}>
                                {this.state.entity.applications.map((connectedApp, index) => {
                                    const appData = this.props.apps.list.find(app => app.artifactId === connectedApp.applicationUid);
                                    return <div key={appData._id} className={classes.connectedAppContainer}>
                                        <div style={{ width: '120px' }}>
                                            {connectedApp.inbound.flows.length ? <button type={'button'} onClick={this.toggleDirectionForApp.bind(this, connectedApp._id, 'inbound')} className={`${classes.direction} ${connectedApp.inbound.active ? classes.directionActive : ''}`}>Inbound --&gt;</button> : null}
                                            {connectedApp.outbound.flows.length ? <button type={'button'} onClick={this.toggleDirectionForApp.bind(this, connectedApp._id, 'outbound')} className={`${classes.direction} ${connectedApp.outbound.active ? classes.directionActive : ''}`}>Outbound &lt;--</button> : null}
                                        </div>
                                        <AppTeaser {...appData} hideControls={true} />
                                        <FormControl className={`${classes.margin} ${classes.secretsWrapper}`}>
                                            <InputLabel htmlFor="secretId">Secret</InputLabel>

                                            <Select
                                                value={connectedApp.secretId}
                                                onChange={this.setSecretForApp.bind(this, connectedApp._id)}
                                                inputProps={{
                                                    name: 'secret',
                                                    id: 'secretId',
                                                }}
                                            >
                                                <MenuItem key={'null'} value={null}>No value</MenuItem>
                                                {this.props.secrets.map(secret => <MenuItem key={secret._id} value={secret._id}>{secret.name}</MenuItem>)}

                                            </Select>

                                        </FormControl>
                                        <div>
                                            <Button variant={'outlined'} type={'button'} onClick={this.removeApp.bind(this, index)}>Delete</Button>
                                        </div>
                                    </div>;
                                })}
                                <Button className={classes.addNewApp} variant="outlined" type={'button'} onClick={this.toggleAddApp.bind(this)}>Add new app</Button>
                            </div>
                        </div>

                        <div>
                            <Button variant="outlined" aria-label="Add" type={'submit'} disabled={!this.state.hasChanges}>
                        Save
                            </Button>
                        </div>

                    </form>

                </Grid>
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    apps: state.apps,
    hubAndSpoke: state.hubAndSpoke,
    auth: state.auth,
    secrets: state.secrets.secrets,
    authClients: state.authClients,
    dataModels: state.metadata.domains,
    domainSchemas: state.metadata.domainSchemas,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getDomains,
    getApps,
    getSecrets,
    getDomainSchemas,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(DispatcherConfigDetails);
