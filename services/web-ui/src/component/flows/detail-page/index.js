import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
// Actions
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';
import locale from 'react-json-editor-ajrm/locale/en';
import JSONInput from 'react-json-editor-ajrm';
import { withRouter } from 'react-router';
import {
    getFlows, deleteFlow, updateFlow, startFlow, stopFlow, executeFlow,
} from '../../../action/flows';
import { getComponents } from '../../../action/components';
// import OIHFlow from './oihFlowStructure.json';
import styles from './styles.css';
import Loader from '../../loader';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const useStyles = {
    flowContainer: {
        width: '98%',
        height: '50vh',
        margin: '0 auto',
        border: '1px solid black',
        fontSize: 20,
        marginTop: 20,
    },
    flowNode: {
        // border: '1px solid blue',
        display: 'flex',
        justifyContent: 'center',
        margin: 20,
        padding: 20,
    },
    flowElement: {
        border: '1px solid red',
        marginBottom: 10,
        width: '120px',
        borderRadius: '10px'
    },
    modal: {
        background: 'white',
        position: 'relative',
        padding: 50,
        height: '100%',
        width: '100%'
    },
    formControl: {
        marginTop: 10,
        minWidth: 120,
    },

};

class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        props.getFlows();
        props.getComponents();
        this.state = {
            position: '',
            loading: true,
            selectedNode: '',
            component: '',
            nodeSettings: '',
            openModal: false,
            parent: '',
            createNodeName: '',
            editNodeName: '',
            leftNodeName: '',
            leftNodeAdded: false,
            rightNodeName: '',
            rightNodeAdded: false,
            addNodeTriggered: false,
            addBranchEditor: false,
            addBranchAtNode: '',
            flow: {
                graph: {
                    nodes: [],
                    edges: [],
                },
            },
        };
    }

    handleChange = (e) => {
        const value = e.target.value;
        this.setState({
            ...this.state,
            [e.target.name]: value
        });
    }

    componentWillReceiveProps(props) {
        const { id } = props.match.params
        const flow = props.flows.all.filter(item => item.id === id);
        this.setState({flow: flow[0]})
      }

    onElementClick = (element) => {
        console.log('onElementClick', element);
        this.props.onEditNode && this.props.onEditNode(element.id);
        this.setState({selectedNode: element})
    }

    displayModal = (parent) =>  {
        this.setState({openModal: true, parent: parent})
    }

    addAfterNode = () => {
        this.setState({openModal: false})
        const { id } = this.props.match.params
        const graph = this.state.flow.graph
        const newNodeId = this.state.createNodeName
        graph.nodes.push({
            id: newNodeId,
            componentId: null,
            function: null,
            fields: {
            }
        });
        const parentHasOnlyOneChild = graph.edges.filter((edge) => edge.source === this.state.parent.id).length === 1;

        if (parentHasOnlyOneChild) {
            graph.edges = graph.edges.map((edge) => {
                if (edge.source === this.state.parent.id) {
                    edge.source = newNodeId;
                }
                return edge;
            });
        }

        graph.edges.push({
            source: this.state.parent.id,
            target: newNodeId,
        });
        this.setState({
            flow: {
                ...this.props.flows.all[0],
                graph,
            },
            createNodeName: ''
            // flow: {graph}
        });
  }

  deleteNode = (node) => {
    
    const { id } = this.props.match.params
    const flow = this.state.flow
    const edgeToAlter = flow.graph.edges.filter(item => item.target === node.id)
    // const edgeToDelete = flow.graph.edges.filter(item => item.source === node.id)
    const nodeToDelete = flow.graph.nodes.filter(item => item.id === node.id)
    const indexNode = flow.graph.nodes.indexOf(nodeToDelete[0]);
    const indexEdge = flow.graph.edges.indexOf(edgeToAlter[0])
    if (indexNode > -1 && indexEdge > -1) {
        flow.graph.nodes.splice(indexNode, 1);
        flow.graph.edges.splice(indexEdge, 1);
        // this.setState({flow: {...this.state.flow,
        //     flow}})
        this.setState({
            flow: {
                ...this.props.flows.all[0],
                flow,
            },
          // flow: {graph}
        });
    }
    }

    addBranchAfterNode = () => {
        this.setState({addBranchEditor: false})
        const graph = this.state.flow.graph;
        
        graph.nodes.push({
            id: this.state.leftNodeName,
            componentId: null,
            function: null,
            fields: {
            }
        });
        graph.nodes.push({
            id: this.state.rightNodeName,
            componentId: null,
            function: null,
            fields: {
            }
        });
        const parentHasOnlyOneChild = graph.edges.filter((edge) => edge.source === this.state.addBranchAtNode.id).length === 1;
  
        if (parentHasOnlyOneChild) {
            graph.edges = graph.edges.map((edge) => {
                if (edge.source === this.state.addBranchAtNode.id) {
                    edge.source = this.state.leftNodeName
                    ;
                }
                return edge;
            });
        }
  
        graph.edges.push({
            source: this.state.addBranchAtNode.id,
            target: this.state.leftNodeName,
        });
        this.setState({leftNodeAdded: true})
        graph.edges.push({
            source: this.state.addBranchAtNode.id,
            target: this.state.rightNodeName,
        });
        this.setState({rightNodeAdded: true})
        this.setState({
          //   flow: {
          //       ...this.props.flows.all[0],
          //       graph,
          //   },
          flow: {graph}
        });
        this.setState({leftNodeAdded: false, rightNodeAdded: false})
    }

    openBranchEditor = (node) => {
        
        this.setState({addBranchEditor: true, addBranchAtNode: node})
    }

  generateSubGraphLeveled = (arr, level) => {
      for (const arrNode of arr[level]) {
          const children = this.props.flows.all[0].graph.nodes.filter((node) => this.props.flows.all[0].graph.edges.find((edge) => edge.source === arrNode.id && edge.target === node.id));
          if (children.length) {
              arr[level + 1] = arr[level + 1] || [];
              arr[level + 1] = arr[level + 1].concat(children);
              this.generateSubGraph(arr, level + 1);
          }
      }

      return arr;
  }

    generateGraphVisualization = (currentContent = [], parent, isRoot, nodeAlignment) => {

        const {
            classes,
        } = this.props;

        const childrenContent = [];
        for (let i = 0; i < parent.children.length; i++) {
            const node = parent.children[i];
            let nodeAlignment = 'center';
            if (i === 0) {
                nodeAlignment = 'left';
            }
            if (parent.children.length === 1) {
                nodeAlignment = 'none';
            }
            if (i === parent.children.length - 1 && parent.children.length > 1) {
                nodeAlignment = 'right';
            }
            childrenContent.push(this.generateGraphVisualization([], node, false, nodeAlignment));
        }

        currentContent.push(<div key={parent.id} className={`${styles.nodeWrapper} ${nodeAlignment}`}>
            
            {/* {!isRoot ? <button>+</button> : null} */}
            <div className={classes.flowElement}>
                <p onClick={this.onElementClick.bind(this, parent)}>{(parent.nodeSettings && parent.nodeSettings.basaasFlows ? parent.nodeSettings.basaasFlows.stepName : parent.id)}</p>
            </div>
            {(parent.children.length && childrenContent.length === 1) ?  <div className={styles.childrenWrapper} style={{position: 'relative'}}><hr style={{transform: 'rotate(90deg)', width: '20px'}}/>{childrenContent} </div> : 
            (parent.children.length && childrenContent.length > 1) ?  <div className={styles.childrenWrapper} style={{position: 'relative'}}><hr style={{transform: 'rotate(90deg)', width: '20px'}}/><div style={{position: 'absolute', right: 300, top: -30, width: 120}}>{childrenContent[0]}<hr style={{position: 'absolute', left: '120px', top: 30, width: '240px', zIndex: -1}}/></div><div style={{position: 'absolute', left: 300, top: -30}}><hr style={{position: 'absolute', right: '120px', top: 30, width: '240px', zIndex: -1}}/>{childrenContent[1]}</div> </div> : null}
            {!parent.children.length ? <div className={styles.childrenWrapper}><button onClick={()=>this.openBranchEditor(parent)}>Branch</button>   
            <button onClick={this.displayModal.bind(this, parent)}>Node</button><button onClick={this.deleteNode.bind(this, parent)} style={{position: 'absolute', top: 20, left: 125}}>X</button>
            
            </div> : null}
            
        </div>);
        return currentContent;
    }

      generateSubGraph = (parent) => {
          const children = this.state.flow.graph.nodes.filter((node) => this.state.flow.graph.edges.find((edge) => edge.source === parent.id && edge.target === node.id));
          parent.children = children || [];
          for (const childNode of parent.children) {
              this.generateSubGraph(childNode);
          }

          return parent;
      }

      generateGraph = () => {
          if(this.state.flow.graph.nodes.length > 0){
            const flowCopy = this.state.flow
            const root = flowCopy.graph.nodes.find((node) => !flowCopy.graph.edges.find((edge) => edge.target === node.id));
           
            if (root) {
                const arr = [root];
                this.generateSubGraph(root);
                return root;
            }
  
            return null;
          }
          
      }

      handleComponentSelection = (event) => {
        this.setState({component: event.target.value})
      }

      render() {
          const {
              classes,
          } = this.props;

          if (!this.props.flows.all[0]) {
              return <Loader />;
          }

          const graph = this.generateGraph();

          if (!graph) {
              return <Loader />;
          }
          const content = this.generateGraphVisualization([], graph, true);

          console.log('components are', this.props.components)
          const { id } = this.props.match.params;
          return (

              <div style={{textAlign: 'center'}}>
                  <h2>Flow Name: {this.props.flows.all[0].name}</h2>
                  <div className={classes.flowContainer}>
                      <p>Flow ID:{this.props.flows.all[0].id}</p>
                      <div className={classes.flowNode}>
                            {content}
                      </div>
                  </div>
                  
                  {this.state.addBranchEditor && 
                    <div>Create Branch:
                        <h3>Left node</h3>
                        <p>Node name:</p>
                        <input type="text" id="leftNodeName" name="leftNodeName" onChange={e=>this.handleChange(e)}/>

                        <h3>Right node</h3>
                        <p>Node name:</p>
                        <input type="text" id="rightNodeName" name="rightNodeName" onChange={this.handleChange}/>
                        <br/>
                        <button style={{marginTop: 20}} onClick={()=>this.addBranchAfterNode()}>CREATE</button>
                        <br/>
                        <button style={{marginTop: 20}} onClick={()=>this.setState({addBranchEditor: false})}>Cancel</button>
                    </div>}

                    <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.openModal}
                    onClose={()=> this.setState({openModal: false})}
                    style={{ position: 'absolute', left: '25%', top: '10%', width: '50%', height: '50%' }}>
                        <div className={classes.modal}>
                            <h2 style={{textAlign: 'center', marginBottom: 50}}>CREATE NODE</h2>
                        Node name: <input type="text" id="createNodeName" name="createNodeName" onChange={e=>this.handleChange(e)}/>
                        <br/>
                        <FormControl className={classes.formControl}>
                            <InputLabel id="demo-simple-select-label">Component</InputLabel>
                            <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={this.state.component}
                            onChange={this.handleComponentSelection}
                            >
                                {this.props.components.all.map(component=><div><MenuItem value={'Component 1'}>{component.name}</MenuItem></div>)}
                            </Select>
                        </FormControl>
                        
                        <p style={{marginTop: 30}}>Node Settings</p>
                            <JSONInput
                                id = 'jsonEdit'
                                locale = {locale}
                                theme = 'dark_vscode_tribute'
                                height = '550px'
                                width = '600px'
                                placeholder = {this.dummyData}
                                // onChange={this.editorChange.bind(this)}
                            />
                            <br/>
                            <div style={{position: 'absolute', bottom: 0, right: 0}}>
                                <Button variant="outlined" aria-label="Add" onClick={() => this.setState({openModal: false})}>
                                    close
                                </Button>
                                <Button variant="outlined" aria-label="Add" onClick={()=> this.addAfterNode()} disabled={this.state.createNodeName === ''}>
                                    Create
                                </Button>
                                {/* <Button variant="outlined" aria-label="Add" onClick={this.saveFlow} disabled={!this.state.wasChanged}>
                                    Save
                                </Button> */}
                            </div>
                            
                        </div>

                    </Modal>
                    {this.state.selectedNode && 
                    <div style={{background: ''}}>
                        <h3>EDITOR</h3>
                        <p>Selected Node is: {this.state.selectedNode.id}</p>
                        Node name: <input type="text" id="editNodeName" name="editNodeName" onChange={e=>this.handleChange(e)}/><br/>
                        <FormControl className={classes.formControl}>
                            <InputLabel id="demo-simple-select-label">Component</InputLabel>
                            <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={this.state.component}
                            onChange={this.handleComponentSelection}
                            >
                                {this.props.components.all.map(component=><div><MenuItem value={'Component 1'}>{component.name}</MenuItem></div>)}
                            </Select>
                        </FormControl>
                        <div style={{background: '', display: 'flex', justifyContent: 'center'}}>
                         <JSONInput
                                id = 'jsonEdit'
                                locale = {locale}
                                theme = 'dark_vscode_tribute'
                                height = '550px'
                                width = '600px'
                                placeholder = {this.dummyData}
                                // onChange={this.editorChange.bind(this)}
                            />
                        </div>
                    </div>}
              </div>

          );
      }
}

const mapStateToProps = (state) => ({
    flows: state.flows,
    components: state.components
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getFlows,
    deleteFlow,
    updateFlow,
    startFlow,
    stopFlow,
    executeFlow,
    getComponents,
}, dispatch);

export default withRouter(flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowDetails));
