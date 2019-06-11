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


// components
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import FlowTeaser from './flow-teaser';

// actions
import { getFlows, createFlow, getFlowsPage } from '../../action/flows';


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

class Flows extends React.Component {
    state= {
        addFlow: false,
        editorData: null,
    }

    constructor(props) {
        super();
        props.getFlows();
    }

    addFlow = () => {
        this.setState({
            addFlow: true,
        });
    };

    saveFlow = () => {
        this.props.createFlow(this.state.editorData);
        this.setState({
            addFlow: false,
        });
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
            });
        }
    }

    prePage = () => {
        if (this.props.flows.meta.page === 1) {
            this.props.getFlowsPage(this.props.flows.meta.totalPages);
        } else {
            this.props.getFlowsPage(this.props.flows.meta.page - 1);
        }
    };

    nextPage = () => {
        if (this.props.flows.meta.page === this.props.flows.meta.totalPages) {
            this.props.getFlowsPage(1);
        } else {
            this.props.getFlowsPage(this.props.flows.meta.page + 1);
        }
    };

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid container spacing={2}>

                    <Grid item xs={8}>
                        <Button variant="outlined" aria-label="Add" onClick={this.addFlow}>
                        Add<Add/>
                        </Button>
                    </Grid>
                    {this.props.flows.meta && <Grid item xs={4}>
                        <Grid container justify="flex-end" spacing={2}>
                            <Grid item >
                                <InputLabel>Flows: </InputLabel>{this.props.flows.meta.total}
                            </Grid>
                            <Grid item >
                                <Button variant="outlined" aria-label="before" onClick={this.prePage} >
                                    <NavigateBefore/>
                                </Button>
                            </Grid>
                            <Grid item >
                                {this.props.flows.meta.page}/{this.props.flows.meta.totalPages}
                            </Grid>
                            <Grid item>
                                <Button variant="outlined" aria-label="next" onClick={this.nextPage}>
                                    <NavigateNext/>
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>}


                </Grid>
                <Grid container justify="center" spacing={2}>
                    {
                        this.props.flows.all.length && this.props.flows.all.map(item => <FlowTeaser key={`flowTeaser-${item.id}`} data={item}/>)
                    }
                </Grid>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.addFlow}
                    onClose={ () => { this.setState({ addFlow: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <JSONInput
                            id = 'jsonEdit'
                            locale = {locale}
                            theme = 'dark_vscode_tribute'
                            height = '550px'
                            width = '600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button variant="outlined" aria-label="Add" onClick={this.saveFlow}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getFlows,
    createFlow,
    getFlowsPage,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Flows);
