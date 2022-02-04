/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-nested-ternary */
import React from 'react';
import axios from 'axios';
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
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import {
    getFlows, deleteFlow, updateFlow, startFlow, stopFlow, executeFlow,
} from '../../../action/flows';
import { getComponents } from '../../../action/components';
import { getSecrets } from '../../../action/secrets';
// import OIHFlow from './oihFlowStructure.json';
import styles from './styles.css';
import Loader from '../../loader';
import { getConfig } from '../../../conf';

const conf = getConfig();

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
        borderRadius: '10px',
    },
    modal: {
        background: 'white',
        position: 'relative',
        padding: 50,
        height: '100%',
        width: '100%',
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
        props.getSecrets();
        this.state = {
            position: '',
            loading: true,
            selectedNode: '',
            component: { name: '' },
            components: '',
            function: '',
            nodeSettings: {},
            fields: {},
            openModal: false,
            parent: '',
            createNodeName: '',
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
        const { value } = e.target;
        switch (e.target.name) {
        case 'flowName':
            this.setState((prevState) => ({
                flow: {
                    ...prevState.flow,
                    name: value,
                },
            }));
            break;
        case 'flowDescription':
            this.setState((prevState) => ({
                flow: {
                    ...prevState.flow,
                    description: value,
                },
            }));
            break;
        case 'flowCron':
            this.setState((prevState) => ({
                flow: {
                    ...prevState.flow,
                    cron: value,
                },
            }));
            break;
        default:

            this.setState({
                ...this.state,
                [e.target.name]: value,
            });
            break;
        }
    }

    async componentDidMount() {
        const { id } = this.props.match.params;

        try {
            const { data } = await axios({
                method: 'get',
                url: `${conf.endpoints.flow}/flows/${id}`,
                withCredentials: true,
            });
            this.setState({ flow: data.data, loading: false, components: this.props.components });
        } catch (err) {
            console.log(err);
        }
    }

    onElementClick = (element) => {
        console.log('onElementClick', element);
        this.props.onEditNode && this.props.onEditNode(element.id);
        this.setState({ selectedNode: element });
    }

    displayModal = (parent) => {
        this.setState({ openModal: true, parent });
    }

    addAfterNode = () => {
        this.setState({ openModal: false });
        const { id } = this.props.match.params;
        const { graph } = this.state.flow;
        const newNodeId = this.state.createNodeName;
        graph.nodes.push({
            id: newNodeId,
            componentId: this.state.component.id,
            function: this.state.function,
            fields: this.state.fields,
            privileged: this.state.component.hasOwnProperty('specialFlags') ? this.state.component.specialFlags.privilegedComponent : '',
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
            createNodeName: '',
            component: '',
            // flow: {graph}
        });
    }

  deleteNode = (node) => {
      const { id } = this.props.match.params;
      const { flow } = this.state;
      const edgeToAlter = flow.graph.edges.filter((item) => item.target === node.id);
      // const edgeToDelete = flow.graph.edges.filter(item => item.source === node.id)
      const nodeToDelete = flow.graph.nodes.filter((item) => item.id === node.id);
      const indexNode = flow.graph.nodes.indexOf(nodeToDelete[0]);
      const indexEdge = flow.graph.edges.indexOf(edgeToAlter[0]);
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
        this.setState({ addBranchEditor: false });
        const { graph } = this.state.flow;

        graph.nodes.push({
            id: this.state.leftNodeName,
            componentId: null,
            function: null,
            fields: {
            },
        });
        graph.nodes.push({
            id: this.state.rightNodeName,
            componentId: null,
            function: null,
            fields: {
            },
        });
        const parentHasOnlyOneChild = graph.edges.filter((edge) => edge.source === this.state.addBranchAtNode.id).length === 1;

        if (parentHasOnlyOneChild) {
            graph.edges = graph.edges.map((edge) => {
                if (edge.source === this.state.addBranchAtNode.id) {
                    edge.source = this.state.leftNodeName;
                }
                return edge;
            });
        }

        graph.edges.push({
            source: this.state.addBranchAtNode.id,
            target: this.state.leftNodeName,
        });
        this.setState({ leftNodeAdded: true });
        graph.edges.push({
            source: this.state.addBranchAtNode.id,
            target: this.state.rightNodeName,
        });
        this.setState({ rightNodeAdded: true });
        this.setState({
            //   flow: {
            //       ...this.props.flows.all[0],
            //       graph,
            //   },
            flow: { graph },
        });
        this.setState({ leftNodeAdded: false, rightNodeAdded: false });
    }

    openBranchEditor = (node) => {
        this.setState({ addBranchEditor: true, addBranchAtNode: node });
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

    generateGraphVisualization = (currentContent = [], parent, /* isRoot, */ nodeAlignment) => {
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
            <div className={classes.flowElement} style={{ border: parent.privileged ? '1px solid green' : '1px solid red' }} onClick={this.onElementClick.bind(this, parent)}>
                <p >{(parent.nodeSettings && parent.nodeSettings.basaasFlows ? parent.nodeSettings.basaasFlows.stepName : parent.id)}</p>
            </div>
            {(parent.children.length && childrenContent.length === 1) ? <div className={styles.childrenWrapper} style={{ position: 'relative' }}><hr style={{ transform: 'rotate(90deg)', width: '20px' }}/>{childrenContent} </div>
                : (parent.children.length && childrenContent.length > 1) ? <div className={styles.childrenWrapper} style={{ position: 'relative' }}><hr style={{ transform: 'rotate(90deg)', width: '20px' }}/><div style={{
                    position: 'absolute', right: 300, top: -30, width: 120,
                }}>{childrenContent[0]}<hr style={{
                        position: 'absolute', left: '120px', top: 30, width: '240px', zIndex: -1,
                    }}/></div><div style={{ position: 'absolute', left: 300, top: -30 }}><hr style={{
                    position: 'absolute', right: '120px', top: 30, width: '240px', zIndex: -1,
                }}/>{childrenContent[1]}</div> </div> : null}
            {!parent.children.length ? <div className={styles.childrenWrapper}><button onClick={() => this.openBranchEditor(parent)}>Branch</button>
                <button onClick={this.displayModal.bind(this, parent)}>Node</button><button onClick={this.deleteNode.bind(this, parent)} style={{ position: 'absolute', top: 20, left: 125 }}>X</button>

            </div> : null}

        </div>);
        // console.log('parent', parent);
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
          if (this.state.flow.graph.nodes.length > 0) {
              const flowCopy = this.state.flow;
              const root = flowCopy.graph.nodes.find((node) => !flowCopy.graph.edges.find((edge) => edge.target === node.id));

              if (root) {
                  const arr = [root];
                  this.generateSubGraph(root);
                  return root;
              }
              return null;
          }
          return null;
      }

      handleComponentSelection = (event) => {
          const selected = event.target.value;
          const component = this.props.components.all.filter((comp) => comp.name === selected)[0];
          console.log('Comp', component);
          this.setState({ component });
      }

      handleNodeSettings = (event) => {
          this.setState({ nodeSettings: event.jsObject });
      }

      handleFieldsInput = (event) => {
          this.setState({ fields: event.jsObject });
      }

      saveFlow = async () => {
          console.log('Saved', this.state);
          for (let i = 0; this.state.flow.nodes.length; i++) {
              delete this.state.flow.nodes[i].children;
          }
          this.props.updateFlow(this.state.flow);
      }

      render() {
          const {
              classes,
          } = this.props;

          if (this.state.loading) {
              return <Loader />;
          }

          const graph = this.generateGraph();

          if (!graph) {
              return <Loader />;
          }
          const content = this.generateGraphVisualization([], graph, true);
          const selNode = this.state.selectedNode;
          const compId = selNode.componentId;
          const comp = this.state.components.all.filter((cp) => cp.id === compId)[0];
          console.log('comp', comp);
          //   const compName = this.state.flow.graph.nodes.componentId === compId;
          //   console.log('compName', compName);

          console.log('components are', this.state.components);
          //   console.log('secrets are', this.props.secrets);
          console.log('state is', this.state);
          console.log('selNode is', selNode);
          //   const { id } = this.props.match.params;
          return (

              <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 24 }}>Flow name: <input type="text" value={this.state.flow.name} name="flowName" onChange={this.handleChange}/></p>
                  <p style={{ fontSize: 24 }}>Flow description: <input type="text" value={this.state.flow.description} name="flowDescription" onChange={this.handleChange}/></p>
                  <p style={{ fontSize: 24 }}>Flow cron: <input type="text" value={this.state.flow.cron} name="flowCron" onChange={this.handleChange}/></p>
                  <button style={{
                      position: 'relative', right: 0, top: 0, width: '100px', height: '30px', background: 'green', color: 'white  ',
                  }} onClick={() => this.saveFlow()}>Save</button>
                  <div className={classes.flowContainer}>
                      <p>Flow ID:{this.props.flows.all[0].id}</p>
                      <div className={classes.flowNode}>
                          {content}
                      </div>

                  </div>

                  {this.state.addBranchEditor
                    && <div>Create Branch:
                        <h3>Left node</h3>
                        <p>Node name:</p>
                        <input type="text" id="leftNodeName" name="leftNodeName" onChange={(e) => this.handleChange(e)}/>

                        <h3>Right node</h3>
                        <p>Node name:</p>
                        <input type="text" id="rightNodeName" name="rightNodeName" onChange={this.handleChange}/>
                        <br/>
                        <button style={{ marginTop: 20 }} onClick={() => this.addBranchAfterNode()}>CREATE</button>
                        <br/>
                        <button style={{ marginTop: 20 }} onClick={() => this.setState({ addBranchEditor: false })}>Cancel</button>
                    </div>}

                  <Modal
                      aria-labelledby="simple-modal-title"
                      aria-describedby="simple-modal-description"
                      open={this.state.openModal}
                      onClose={() => this.setState({ openModal: false, component: { name: '' } })}
                      style={{
                          position: 'absolute', left: '25%', top: '10%', width: '50%', height: '60%',
                      }}>
                      <div className={classes.modal}>
                          <h2 style={{ textAlign: 'center', marginBottom: 50 }}>CREATE NODE</h2>
                        Node name: <input type="text" id="createNodeName" name="createNodeName" onChange={(e) => this.handleChange(e)}/>
                          <br/>
                          <FormControl className={classes.formControl}>
                              <InputLabel id="demo-simple-select-label">Component</InputLabel>
                              <Select
                                  labelId="demo-simple-select-label"
                                  id="demo-simple-select"
                                  value={this.state.component.name}
                                  onChange={(e) => this.handleComponentSelection(e)}
                              >
                                  {this.props.components.all.map((component) => <MenuItem value={component.name} key={component.id}><img src={component.distribution.image} alt="comp_img"/>{component.name} {component.hasOwnProperty('specialFlags') ? '(Privileged)' : null } {/* {!component.specialFlags.privilegedComponent ? '(Privileged)' : null} */}</MenuItem>)}
                              </Select>
                          </FormControl>
                          <br/>
                          <br/>
                          Function: <input type="text" id="function" name="function" onChange={(e) => this.handleChange(e)}/>
                          <br/>
                          <FormControl className={classes.formControl}>
                              <InputLabel id="demo-simple-select-label">Secrets</InputLabel>
                              <Select
                                  labelId="demo-simple-select-label"
                                  id="demo-simple-select"
                                  value={this.state.component.name}
                                  onChange={(e) => this.handleSecretSelection(e)}
                              >
                                  {this.props.secrets.secrets.map((secret) => <MenuItem value={secret.name} key={secret.name}>{secret.name}</MenuItem>)}
                              </Select>
                          </FormControl>

                          <p style={{ marginTop: 30 }}>Node Settings</p>
                          <JSONInput
                              id = 'jsonEdit'
                              locale = {locale}
                              theme = 'dark_vscode_tribute'
                              height = '350px'
                              width = '600px'
                              placeholder = {this.dummyData}
                              onChange={(e) => this.handleNodeSettings(e)}
                              // onChange={this.editorChange.bind(this)}
                          />
                          <p>Fields (optional)</p>
                          <JSONInput
                              id = 'jsonEdit'
                              locale = {locale}
                              theme = 'dark_vscode_tribute'
                              height = '350px'
                              width = '600px'
                              placeholder = {this.dummyData}
                              onChange={(e) => this.handleFieldsInput(e)}
                          />
                          <br/>
                          <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                              <Button variant="outlined" aria-label="Add" onClick={() => this.setState({ openModal: false, component: { name: '' } })}>
                                    Close
                              </Button>
                              <Button variant="outlined" aria-label="Add" onClick={() => this.addAfterNode()} disabled={!this.state.createNodeName || !this.state.component}>
                                    Create
                              </Button>
                              {/* <Button variant="outlined" aria-label="Add" onClick={this.saveFlow} disabled={!this.state.wasChanged}>
                                    Save
                                </Button> */}
                          </div>

                      </div>

                  </Modal>
                  {this.state.selectedNode
                    && <div style={{ background: '', paddingBottom: 100, marginTop: 50 }}>
                        <h3>EDITOR</h3>
                        <p>Selected Node is: {this.state.selectedNode.id}</p>
                        Node name: <input type="text" id="selectedNode" name="selectedNode" value={selNode.id} onChange={(e) => this.handleChange(e)}/><br/>
                        <FormControl className={classes.formControl}>
                            <InputLabel id="demo-simple-select-label">Component</InputLabel>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={this.state.component.name}
                                onChange={this.handleComponentSelection}
                            >
                                {this.props.components.all.map((component) => <MenuItem value={component.name} key={component.id}>{component.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <br/>
                        <br/>
                        Function: <input type="text" id="function" name="function" onChange={(e) => this.handleChange(e)}/>
                        <br/>
                        <FormControl className={classes.formControl}>
                            <InputLabel id="demo-simple-select-label">Secrets</InputLabel>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={this.state.component.name}
                                onChange={(e) => this.handleSecretSelection(e)}
                            >
                                {this.props.secrets.secrets.map((secret) => <MenuItem value={secret.name} key={secret.name}>{secret.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <div style={{
                            background: '   ', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left',
                        }}>
                            <p style={{
                                marginTop:
                                10,
                            }}>Node Settings (optional)</p>
                            <br/>
                            <JSONInput
                                id = 'jsonEdit'
                                locale = {locale}
                                theme = 'dark_vscode_tribute'
                                height = '350px'
                                width = '100%'
                                placeholder = {this.dummyData}
                                // onChange={this.editorChange.bind(this)}
                            />
                            <p>Fields (optional)</p>
                            <br/>
                            <JSONInput
                                id = 'jsonEdit'
                                locale = {locale}
                                theme = 'dark_vscode_tribute'
                                height = '350px'
                                width = '100%'
                                placeholder = {this.dummyData}
                                onChange={(e) => this.handleJSONInput(e)}
                            />
                        </div>
                        <div style={{ marginTop: 10 }}> <button onClick={() => this.setState({ selectedNode: '' })}>Cancel</button>
                            <button>Save</button></div>

                    </div>}
              </div>

          );
      }
}

const mapStateToProps = (state) => ({
    flows: state.flows,
    components: state.components,
    secrets: state.secrets,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getFlows,
    deleteFlow,
    updateFlow,
    startFlow,
    stopFlow,
    executeFlow,
    getComponents,
    getSecrets,
}, dispatch);

export default withRouter(flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowDetails));
