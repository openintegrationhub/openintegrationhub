import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import clone from 'clone';
import Tree from 'react-d3-tree';
import axios from 'axios'
// import moment from 'moment';
// Ui
import { withStyles } from '@material-ui/styles';
// import Accordion from '@material-ui/core/Accordion';
// import AccordionSummary from '@material-ui/core/AccordionSummary';
// import Button from '@material-ui/core/Button';
// import InputLabel from '@material-ui/core/InputLabel';
// import Typography from '@material-ui/core/Typography';
// import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// import Modal from '@material-ui/core/Modal';
// import {
//     Delete, Edit, PlayArrow, Stop, Send,
// } from '@material-ui/icons';

// // Componente
// import JSONInput from 'react-json-editor-ajrm';
// import locale from 'react-json-editor-ajrm/locale/en';
// // Diagram
// import FlowGraph from '../flow-graph';

// Actions
import { withRouter } from 'react-router';
import {
    getFlows, deleteFlow, updateFlow, startFlow, stopFlow, executeFlow,
} from '../../../action/flows';
import Loader from '../../loader';

const useStyles = {
    flowContainer: {
        width: '98%',
        height: '40vh',
        margin: '0 auto',
        border: '1px solid black',
        fontSize: 20,
        marginTop: 20,
    },
    flowNode: {
        border: '1px solid blue',
        margin: 20,
        padding: 20,
    },
    flowElement: {
        border: '1px solid red',
    },

};

let root;
const edgeArray = [];
const nodeArray = [];

class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        props.getFlows();
        this.state = {
            position: '',
            loading: true,
            isLoading: true,
            treeChanged: false,
            flowObject: '',
            data: '',
            edges: '',
            nodes: '',
            selectedNode: '',
            parentOfSelected: '',
            nodeName: '',
            nodeId: '',
            nodeComponentId: '',
            nodeDescription: '',
            nodeFunction: '',
            nodeFields: '',
            nodeSettings: '',
        };
    }

    async componentDidMount() {
        try {

            const result = await axios({
                method: 'get',
                url: 'http://localhost:3014/flows',
                withCredentials: true,
            });
            console.log('Mountrd', result);
            this.setState({ flowObject: result.data.data[0], isLoading: false });

            if (!this.state.data) {
                this.setupTree();
            }
            return result;
        } catch (err) {
            console.log(err);
        }
        console.log('Ting');
        return null;
    }

    searchTree(element, matchingTitle) {
        if (element.id === matchingTitle) {
            return element;
        } 
        if (element.children != null) {
            let i;
            let result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                result = this.searchTree(element.children[i], matchingTitle);
            }

            return result;
        }
        return null;
    }

    selectNode = (e, unselect) => {
        if (unselect) {
            this.setState({ selectedNode: '' });
            return;
        }
        const nextData = clone(this.state.data);
        console.log('nextData', nextData.id, e.data.id)
        const selNode = this.searchTree(nextData, e.data.id);
        // console.log('selNode', selNode)
        this.setState({ selectedNode: selNode });
        this.setState({ parentOfSelected: e.parent });
    };

    

    dataToDisplay = () => {
        if (!this.state.isLoading) {
            const content = this.state.flowObject.graph.nodes.find(node => node.id === this.state.selectedNode.id);
            return content;
        }
        return null;
    };


    setupTree = () => {
        const tree = [];
        const flowClone = clone(this.state.flowObject);

        if (flowClone) {
        /* eslint no-unused-vars: */
            const flowObj = flowClone.graph.nodes.forEach((node) => {
                const matchingEdge = flowClone.graph.edges.find(edge => edge.target === node.id);

                tree.push({
                    id: node.id,
                    name: node.name,
                    parent: matchingEdge ? matchingEdge.source : null,
                    componentId: node.componentId,
                    description: node.description,
                    function: node.function,
                    children: [],
                });
            });
        }

        const idMapping = tree.reduce((acc, el, i) => {
            acc[el.id] = i;
            return acc;
        }, {});

        tree.forEach((el) => {
            if (el.parent === null) {
                root = el;

                return;
            }
            // Use our mapping to locate the parent element in our data array
            const parentEl = tree[idMapping[el.parent]];
            // Add our current el to its parent's `children` array
            parentEl.children = [...(parentEl.children || []), el];
        });
        this.setState({ data: root });
    }

    handleChange(evt) {
        const { value } = evt.target;
        this.setState({
            [evt.target.name]: value,
        });
    }

      render() {
          const {
              classes,
          } = this.props;

          if (!this.props.flows.all[0]) {
              return <Loader />;
          }

          

          const { id } = this.props.match.params;
          const displayData = this.dataToDisplay();
          console.log('Id', id);
          console.log('selected node', this.state.selectedNode)
          return (

              <div>
                  {/* <h2>{this.props.flows.all[0].name}</h2>
                  <div className={classes.flowContainer}>
                      <p>{this.props.flows.all[0].id}</p>
                      <div className={classes.flowNode}>

                          <div className={classes.flowElement}>
                              <p>send Mail</p>
                          </div>
                      </div>

                      <div className={classes.flowNode}>
                          <p>Jira</p>
                          <div className={classes.flowElement}>
                              <p>create Todo</p>
                          </div>
                      </div>
                      <div className={classes.flowNode}>
                          <button> Add Branch</button>
                          <button> Add Node</button>
                      </div>

                  </div> */}

                  <div className="header">
                            {!this.state.isLoading ? <div>
                                <h3 style={{ textAlign: 'center' }}>Flow id: {id}</h3>
                                <div id="treeWrapper" style={{ width: '100vw', height: '60vh', background: 'silver' }}>
                                    {this.state.data && <Tree data={this.state.data} onNodeClick={e => this.selectNode(e)} translate={{
                                        x: window.innerWidth / 4,
                                        y: 250,
                                    }} rootNodeClassName="node__root"
                                    branchNodeClassName="node__branch"
                                    leafNodeClassName="node__leaf"
                                    />}</div>
                                {/* <div style={{ padding: '10px' }}>
                                    <p> Selected node : <span>{this.state.selectedNode.name}</span></p>
                                    <div>{displayData ? <div>
                                        <p>ID: {displayData.id}</p>
                                        <p>Name: {displayData.name}</p>
                                        <p>{t('flows.function')}: {displayData.function}</p>
                                        <p>{t('flows.description')}: {displayData.description}</p></div> : null}</div>
                                    {this.state.selectedNode && <div>
                                        <input name="nodeId" onChange={e => this.handleChange(e)} value={this.state.nodeId} placeholder="Node ID *"/>
                                        <input name="nodeName" onChange={e => this.handleChange(e)} value={this.state.nodeName} placeholder="Node Name *"/>
                                        <input name="nodeComponentId" onChange={e => this.handleChange(e)} value={this.state.nodeComponentId} placeholder="Node Component ID *"/>
                                        <input name="nodeDescription" onChange={e => this.handleChange(e)} value={this.state.nodeDescription} placeholder="Node Description *"/>
                                        <input name="nodeFunction" onChange={e => this.handleChange(e)} value={this.state.nodeFunction} placeholder="Node Function *"/>
                                        <input name="nodeFields" onChange={e => this.handleChange(e)} value={this.state.nodeFields} placeholder="Node Fields (optional)"/>
                                        <input name="nodeSettings" onChange={e => this.handleChange(e)} value={this.state.nodeSettings} placeholder="Node Settings (optional)"/>
                                        <button onClick={e => this.addChildNode(e)} style={{ marginLeft: 10, marginRight: 10 }}
                                            disabled={!this.state.nodeId || !this.state.nodeName || !this.state.nodeComponentId || !this.state.nodeDescription || !this.state.nodeFunction }>{t('flows.add.node')}</button>
                                        <button onClick={e => this.removeChildNode(e)}>Remove node</button><br/>
                                        <button style={{ marginTop: '10px' }} onClick={() => this.handleSave()}>{t('flows.save')}</button>
                                    </div>}
                                </div> */}
                            </div> : null}
                        </div>
              </div>

          );
      }
}

const mapStateToProps = (state) => ({
    flows: state.flows,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getFlows,
    deleteFlow,
    updateFlow,
    startFlow,
    stopFlow,
    executeFlow,
}, dispatch);

export default withRouter(flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowDetails));
