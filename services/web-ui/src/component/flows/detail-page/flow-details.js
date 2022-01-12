import React from 'react';
import uuid from 'uuid';

import VisNetworkReactComponent from 'vis-network-react';
import { InputLabel, Modal } from '@material-ui/core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import flow from 'lodash/flow';
import { withStyles } from '@material-ui/styles';
// import * as tenantsActions from '../../../action/tenants';
import axios from 'axios';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import { Add, Edit, Delete } from '@material-ui/icons';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { getConfig } from '../../../conf';
import withForm from '../../../hoc/with-form';
import EditAddNode from './add-edit-node';

const defaultdata = {
    nodes: [
        { id: 'n1', label: 'Node 1' },
        { id: 'n2', label: 'Node 2' },
        { id: 'n3', label: 'Node 3' },
        { id: 'n4', label: 'Node 4' },
        { id: 'n5', label: 'Node 5' },
    ],
    edges: [
        { from: 'n1', to: 'n3' },
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n4' },
        { from: 'n2', to: 'n5' },
        { from: 'n3', to: 'n3' },
    ],
};

// const defaultFlow = {
//     status: 'inactive',
//     name: 'Placetel Connector to code component',
//     description: 'Testing placetel',
//     graph: {
//         nodes: [
//             {
//                 id: 'step_1',
//                 componentId: '5f72fb80bea665001b8d7ffd',
//                 name: 'Placetel Connector',
//                 function: 'getContacts',
//                 credentials_id: '5f73286353966a0011861cea',
//             },
//             {
//                 id: 'step_2',
//                 componentId: '5cdaba4d6474a5001a8b2588',
//                 name: 'Code Component',
//                 function: 'execute',
//                 description: 'Exemplary flow node',
//                 fields: {
//                     code: 'function* run() {console.log(\'Calling external URL\');yield request.post({uri: \'https://webhook.site/4bbd1546-1522-4609-bc49-66aee2e37e35\', body: msg.body, json: true});}',
//                 },
//             },
//         ],
//         edges: [
//             {
//                 source: 'step_1',
//                 target: 'step_2',
//             },
//         ],
//     },
//     type: 'ordinary',
//     cron: '* * * * *',
//     owners: [
//         {
//             id: '5d1b60df3236130011ff3094',
//             type: 'user',
//         },
//     ],
//     createdAt: '2020-09-29T12:32:54.946Z',
//     updatedAt: '2021-03-15T09:10:31.600Z',
//     id: '5f7329760694fc001bc34774',
// };

// const transformedFlow = {
//     nodes: defaultFlow.graph.nodes.map(node => ({ ...node, label: node.name, title: `${node.componentId}<br /><span style="color: red">${node.function}</span>` })),
//     edges: defaultFlow.graph.edges.map(edge => ({ from: edge.source, to: edge.target })),
// };

const useStyles = {
    componentNode: {
        margin: '25px',
        background: 'rgb(243, 243, 243)',
        borderRadius: '50%',
        height: '150px',
        width: '150px',
    },
    container: {
        marginTop: '24px',
    },
    buttons: {
        margin: '10px',
    },
};

class EditFlowDetails extends React.PureComponent {
    state = {
        data: this.props.data || defaultdata,
        networkNodes: [],
        flow: {
            type: '',
            graph: {
                nodes: [],
                edges: [],
            },
        },
        transformedFlow: {
            nodes: [],
            edges: [],
        },
    }

    events = {
        click(params) {
            // params.event = '[original event]';
            console.log(
                `click event, getNodeAt returns: ${this.getNodeAt(params.pointer.DOM)}`, this,
            );
        },
        doubleClick(params) {
            console.log('doubleClick Event:', params);
            // params.event = '[original event]';
        },
        oncontext(params) {
            console.log('oncontext Event:', params);

            // params.event = '[original event]';
        },
        dragStart(params) {
            // There's no point in displaying this event on screen, it gets immediately overwritten
            // params.event = '[original event]';
            console.log('dragStart Event:', params);
            console.log(
                `dragStart event, getNodeAt returns: ${
                    this.getNodeAt(params.pointer.DOM)}`,
            );
        },
        // dragging(params) {
        //     params.event = '[original event]';
        // },
        dragEnd(params) {
            // params.event = '[original event]';
            console.log('dragEnd Event:', params);
            console.log(
                `dragEnd event, getNodeAt returns: ${this.getNodeAt(params.pointer.DOM)}`,
            );
        },
        // controlNodeDragging(params) {
        //     // params.event = '[original event]';
        // },
        controlNodeDragEnd(params) {
            // params.event = '[original event]';
            console.log('controlNodeDragEnd Event:', params);
        },
        // zoom(params) {},
        showPopup(params) {
            console.log('showpopup Event', params);
        },
        hidePopup() {
            console.log('hidePopup Event');
        },
        select(params) {
            console.log('select Event:', params);
        },
        selectNode(params) {
            console.log('selectNode Event:', params);
        },
        selectEdge(params) {
            console.log('selectEdge Event:', params);
        },
        deselectNode(params) {
            console.log('deselectNode Event:', params);
        },
        deselectEdge(params) {
            console.log('deselectEdge Event:', params);
        },
        hoverNode(params) {
            console.log('hoverNode Event:', params);
        },
        hoverEdge(params) {
            console.log('hoverEdge Event:', params);
        },
        blurNode(params) {
            console.log('blurNode Event:', params);
        },
        blurEdge(params) {
            console.log('blurEdge Event:', params);
        },
    }

    setNetworkNodes() {

    }

    async componentDidMount() {
        try {
            console.log('Props', this.props);
            const result = await axios({
                method: 'get',
                url: `${getConfig().endpoints.flow}/flows/${this.props.flowId}`,
                withCredentials: true,
            });

            // const transformedFlow = {
            //     nodes: result.data.data.graph.nodes.map(node => ({ ...node, label: node.name, title: `${node.componentId}<br /><span style="color: red">${node.function}</span>` })),
            //     edges: result.data.data.graph.edges.map(edge => ({ from: edge.source, to: edge.target })),
            // };

            this.setState({ flow: result.data.data, isLoading: false });
        } catch (err) {
            console.log(err);
        }
    }

    handleAddNode = () => {
        const id = uuid.v4();
        this.setState({
            // transformedFlow: {
            //     ...this.state.transformedFlow,
            //     nodes: [...this.state.transformedFlow.nodes, { id, label: `Node ${id}` }],
            //     edges: this.state.selectedNodeId ? [...this.state.transformedFlow.edges, { from: this.state.selectedNodeId, to: id }] : this.state.transformedFlow.edges,
            // },
            flow: {
                ...this.state.flow,
                graph: {
                    ...this.state.flow.graph,
                    nodes: [...this.state.flow.graph.nodes, { id, name: `Node ${this.state.data.nodes.length + 1}` }],
                    edges: this.state.selectedNodeId ? [...this.state.flow.graph.edges, { source: this.state.selectedNodeId, target: id }] : this.state.flow.graph.edges,
                },
            },
        }, () => {
            this.setState({
                editMode: true,
                nodeMode: 'add',
                selectedNodeId: id,
            });
        });
        if (this.state.selectedNodeId) {
            // console.log('edge', this.state.transformedFlow.edges, { from: this.state.selectedNodeId, to: id });
        }
    }

    editNode = () => {
        if (this.state.selectedNodeId) {
            console.log('edit', this.state.selectedNodeId);
            this.setState({
                editMode: true,
                nodeMode: 'edit',
            });
        }
    }


    getSubTreeNodes(nodeId) {
        let allChildren = [nodeId];
        const nodeChildrenIds = this.state.flow.graph.edges.filter(edge => edge.source === nodeId && edge.target !== nodeId).map(edge => edge.target);
        if (nodeChildrenIds.length) {
            console.log('has children', nodeChildrenIds);
            allChildren.push(nodeChildrenIds);
            console.log('allChildren outer', allChildren);
            for (const id of nodeChildrenIds) {
                console.log('iterate child', id);
                allChildren = allChildren.concat(this.getSubTreeNodes(id));
                console.log('allChildren inner', allChildren);
            }
        }
        return allChildren;
    }

    removeNode = () => {
        console.log('find  sub tree', this.getSubTreeNodes(this.state.selectedNodeId));
        const nodesToRemove = this.getSubTreeNodes(this.state.selectedNodeId);

        this.setState({
            flow: {
                ...this.state.flow,
                graph: {
                    ...this.state.flow.graph,
                    nodes: this.state.flow.graph.nodes.filter(node => !nodesToRemove.includes(node.id)),
                    edges: this.state.flow.graph.edges.filter(edge => !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target)),
                },
            },
            selectedNodeId: null,
        }, () => console.log(this.state));
    }

    selectNode = (a) => {
        console.log('SN', a.nodes[0], this);
        this.setState({
            selectedNodeId: a.nodes[0],
        });
    }

    doubleClick = (a) => {
        console.log('DC', a.nodes[0], this.state);
        this.setState({
            editMode: true,
        });
    }

    getNodes = (a) => {
        this.setState({
            networkNodes: a,
        });
    }

    saveFlow = () => {
        console.log(this.state.flow, this.state);
    }

    onStepEdit = (data) => {
        console.log('onFlowEdit', data, this.state.selectedNodeId);

        const modifiedNodes = this.state.flow.graph.nodes.map((node) => {
            if (node.id === this.state.selectedNodeId) {
                return data;
            }
            return node;
        });
        this.setState({
            flow: {
                ...this.state.flow,
                graph: {
                    ...this.state.flow.graph,
                    nodes: modifiedNodes,
                },
            },
        });
    }

    setVal = (fieldName, e) => {
        this.setState({
            flow: {
                ...this.state.flow,
                [fieldName]: e.target.value,
            },
        });
    }

    render() {
        const { classes } = this.props;

        const transformedFlow = {
            nodes: this.state.flow.graph.nodes.map(node => ({ ...node, label: node.name, title: `${node.function}<br /><span style="color: grey">${node.description}</span>` })),
            edges: this.state.flow.graph.edges.map(edge => ({ from: edge.source, to: edge.target })),
        };

        return (

            <Container className={classes.wrapper} maxWidth={'md'}>

                <Grid container spacing={2} style={{ marginTop: '50px' }}>

                    <Grid item xs={12} className={classes.margin}>
                        <FormControl fullWidth className={classes.margin}>
                            <InputLabel htmlFor="name">Name</InputLabel>
                            <Input
                                required
                                id="name"
                                name="name"
                                onChange={this.setVal.bind(this, 'name')}
                                value={this.state.flow.name || ''}
                            />
                        </FormControl>
                    </Grid>

                    <Grid item xs={6} className={classes.margin}>
                        <FormControl fullWidth className={classes.margin}>
                            <InputLabel htmlFor="type">Type</InputLabel>
                            <Select
                                value={this.state.flow.type}
                                onChange={this.setVal.bind(this, 'type')}
                            >
                                <MenuItem key={'ordinary'} value={'ordinary'}>ordinary</MenuItem>
                                <MenuItem key={'realtime'} value={'realtime'}>realtime</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={6} className={classes.margin}>
                        <FormControl fullWidth className={classes.margin}>
                            <InputLabel htmlFor="cron">Cron</InputLabel>
                            <Input
                                required
                                id="cron"
                                name="cron"
                                onChange={this.setVal.bind(this, 'cron')}
                                value={this.state.flow.cron || ''}
                            />
                        </FormControl>
                    </Grid>

                </Grid>

                <Grid container spacing={2}>

                    <Grid item xs={6} style={{ marginTop: '24px' }}>
                        <Button disabled={!this.state.selectedNodeId} className={classes.buttons} variant="outlined" aria-label="Add" onClick={this.handleAddNode}>
                            Add <Add />
                        </Button>
                        <Button disabled={!this.state.selectedNodeId} className={classes.buttons} variant="outlined" aria-label="Edit" onClick={this.editNode}>
                            Edit <Edit />
                        </Button>
                        <Button disabled={!this.state.selectedNodeId} className={classes.buttons} variant="outlined" aria-label="Remove" onClick={this.removeNode}>
                            Remove <Delete />
                        </Button>
                    </Grid>

                </Grid>

                <div className={classes.container} style={{ height: '500px' }}>

                    <Modal
                        open={this.state.editMode}
                        onClose={() => this.setState({ editMode: false })}
                        style={{
                            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        }}
                    >
                        <EditAddNode
                            id={this.state.selectedNodeId}
                            mode={this.state.nodeMode}
                            data={this.state.flow.graph.nodes.find(node => node.id === this.state.selectedNodeId)}
                            onSave={this.onStepEdit}
                        />
                    </Modal>


                    <VisNetworkReactComponent
                        style={{ border: '1px solid', height: '500px' }}
                        data={transformedFlow}
                        options={{
                            physics: {
                                enabled: false,
                                repulsion: {
                                    nodeDistance: 300,
                                    springLength: 300,
                                },
                            },
                            edges: {
                                arrows: 'to',
                            },
                            layout: {
                                hierarchical: {
                                    enabled: true,
                                    direction: 'LR',
                                    sortMethod: 'directed',
                                    nodeSpacing: 300,
                                    levelSeparation: 200,
                                },
                            },
                            nodes: {
                                shape: 'box',
                                shapeProperties: {
                                    borderRadius: 7,
                                },
                                widthConstraint: {
                                    maximum: 150,
                                    minimum: 150,
                                },
                            },
                        }}
                        events={{
                            selectNode: this.selectNode,
                            doubleClick: this.doubleClick,

                        }}
                        getNodes={this.getNodes}
                    />
                    <Grid container spacing={2}>

                        <Grid item xs={6} style={{ marginTop: '24px' }}>
                            <Button variant="contained" color="primary" aria-label="Save" onClick={this.saveFlow}>
                                Save
                            </Button>
                        </Grid>

                    </Grid>


                </div>
            </Container>


        );
    }
}

const mapStateToProps = state => ({
    tenants: state.tenants,
});
const mapDispatchToProps = dispatch => bindActionCreators({

}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withForm,
)(EditFlowDetails);
