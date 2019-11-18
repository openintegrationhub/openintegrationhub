import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import {
    Add,
} from '@material-ui/icons';
import Modal from '@material-ui/core/Modal';
import {
    TextField, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup,
} from '@material-ui/core';

// actions
import {
    getApps,
} from '../../action/app-directory';
import {
    getDispatcherConfigs,
    createDispatcherConfig,
    deleteDispatcherConfig,
} from '../../action/hub-spoke';

import { getDomains } from '../../action/metadata';
import DispatcherConfigTeaser from './teaser';


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

class HubAndSpoke extends React.Component {
    state = {
        addEntity: false,
        entity: {
            dataModel: '',
            name: '',
        },
    }

    async componentDidMount() {
        await this.props.getApps();
        await this.props.getDispatcherConfigs();
        await this.props.getDomains();
    }

    addNewEntity = async (e) => {
        e.preventDefault();
        await this.props.createDispatcherConfig({ ...this.state.entity });
        this.setState({
            addEntity: false,
        });
    }

    toggleAddEntity = async (e) => {
        e.preventDefault();
        this.setState({
            addEntity: true,
        });
    }

    setEntityVal = (fieldName, e) => {
        const val = e.target.value;
        console.log(fieldName, val, e.target.value);
        this.setState({
            entity: {
                ...this.state.entity,
                [fieldName]: val,
            },
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid container spacing={2}>

                    <Grid item xs={6}>
                        <Button variant="outlined" aria-label="Add" onClick={this.toggleAddEntity.bind(this)}>
                        Add<Add/>
                        </Button>
                    </Grid>

                </Grid>
                <div>
                    {
                        this.props.hubAndSpoke.list.map(item => <DispatcherConfigTeaser
                            key={`teaser-${item.id}`}
                            {...item}
                            onEdit={() => {}}
                            onDelete={() => {}}
                        />)
                    }
                </div>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.addEntity}
                    onClose={ () => { this.setState({ addApp: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <Grid container justify="center" spacing={2}>
                            <form onSubmit={this.addNewEntity}>
                                <FormControl fullWidth className={classes.margin}>
                                    <TextField
                                        id="config-name"
                                        label="Name"
                                        className={classes.textField}
                                        value={this.state.entity.name}
                                        onChange={this.setEntityVal.bind(this, 'name')}
                                        margin="normal"
                                        required
                                    />
                                </FormControl>

                                <FormControl component="fieldset" className={classes.formControl}>
                                    <FormLabel component="legend">Data model</FormLabel>
                                    <RadioGroup aria-label="dataModel" name="dataModel" value={this.state.entity.dataModel} onChange={this.setEntityVal.bind(this, 'dataModel')}>
                                        {this.props.dataModels.map(dataModel => <FormControlLabel key={dataModel.id} value={dataModel.id} control={<Radio />} label={dataModel.name} />)}
                                    </RadioGroup>
                                </FormControl>

                                <Button variant="contained" className={classes.button} aria-label="Add" onClick={this.addNewEntity}>
                                        Save
                                </Button>
                                <Button variant="contained" className={classes.button} aria-label="Cancel" onClick={() => { this.setState({ addEntity: false }); }}>
                                    Cancel
                                </Button>
                            </form>
                        </Grid>

                    </div>

                </Modal>
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    apps: state.apps,
    dataModels: state.metadata.domains,
    auth: state.auth,
    hubAndSpoke: state.hubAndSpoke,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getApps,
    getDomains,
    getDispatcherConfigs,
    createDispatcherConfig,
    deleteDispatcherConfig,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(HubAndSpoke);
