import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';
import Modal from '@material-ui/core/Modal';


// components
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import FlowTeaser from './flow-teaser';

// actions
import { getFlows, createFlow } from '../../action/flows';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
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

    saveFlow() {
        console.log(JSON.stringify(this.state.editorData));
        console.log(this.state.editorData);
        this.props.createFlow(this.state.editorData);
        // this.setState({
        //     addFlow: false,
        // });
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.json,
            });
        }
    }

    render() {
        const {
            classes,
        } = this.props;
        const placeholder = {
            name: 'My Flow',
            description: 'This flow takes actions at regular invervals based on a set timer.',
            graph: {
                nodes: [
                    {
                        id: 'step_1',
                        componentId: '5ca5c44c187c040010a9bb8b',
                        function: 'getPersonsPolling',
                        name: 'MS Office Adapter',
                        description: 'string',
                        fields: {
                            interval: 'minute',
                        },
                    },
                ],
                edges: [
                    {
                        id: 'string',
                        config: {
                            condition: 'string',
                            mapper: {},
                        },
                        source: 'step_1',
                        target: 'step_2',
                    },
                ],
            },
            type: 'ordinary',
            cron: '* /2 * * * *',
            owners: [
                {
                    id: 'string',
                    type: 'string',
                },
            ],
        };
        return (
            <Grid item xs={12}>
                <Button variant="outlined" aria-label="Add" onClick={this.addFlow}>
                        Add<AddIcon/>
                </Button>
                {
                    this.props.flows.length && this.props.flows.map(item => <FlowTeaser key={`flowTeaser-${item._id}`} data={item}/>)
                }
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
                            placeholder = {placeholder}
                            locale = {locale}
                            theme = 'dark_vscode_tribute'
                            height = '550px'
                            width = '600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button variant="outlined" aria-label="Add" onClick={this.saveFlow.bind(this)}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getFlows,
    createFlow,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Flows);
