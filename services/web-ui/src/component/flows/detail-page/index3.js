import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// import moment from 'moment';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
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
import OIHFlow from './oihFlowStructure.json';
import styles from './styles.css';
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

};

class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        props.getFlows();
        this.state = {
            position: '',
            loading: true,
            selectedNode: '',
            addNodeTriggered: false,
            flow: {
                graph: {
                    nodes: [],
                    edges: [],
                },
            },
        };
    }

    componentDidUpdate(){
        
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

    addAfterNode = (parent) => {
        const { id } = this.props.match.params
        const graph = this.state.flow.graph;
    //   const graph = { ...this.props.flows.all[0].graph };
    //   console.log('Graph before', graph)
      const newNodeId = `step_${Math.round(Math.random() * 987654)}`;
      graph.nodes.push({
          id: newNodeId,
          componentId: null,
          function: null,
          fields: {
          }
      });
      const parentHasOnlyOneChild = graph.edges.filter((edge) => edge.source === parent.id).length === 1;

      if (parentHasOnlyOneChild) {
          graph.edges = graph.edges.map((edge) => {
              if (edge.source === parent.id) {
                  edge.source = newNodeId;
              }
              return edge;
          });
      }

      graph.edges.push({
          source: parent.id,
          target: newNodeId,
      });

    //   console.log('Graph after', graph)
      this.setState({
          flow: {
              ...this.state.flow,
              graph,
          },
        // flow: {graph}
      });
      console.log('state', this.state)
    
  }

  deleteNode = (node) => {
    const { id } = this.props.match.params
    const flow = this.state.flow
    console.log('flow', flow)

    const edgeToAlter = flow.graph.edges.filter(item => item.target === node.id)
    // const edgeToDelete = flow.graph.edges.filter(item => item.source === node.id)
    const nodeToDelete = flow.graph.nodes.filter(item => item.id === node.id)


    const indexNode = flow.graph.nodes.indexOf(nodeToDelete[0]);
    const indexEdge = flow.graph.edges.indexOf(edgeToAlter[0])
if (indexNode > -1 && indexEdge > -1) {
    flow.graph.nodes.splice(indexNode, 1); // 2nd parameter means remove one item only
    // flow.graph.edges.splice(indexEdge, 1);
    this.setState({flow: flow})
}

console.log('Check this out', flow.graph); 

    
  }

  generateSubGraphLeveled = (arr, level) => {
      // console.log('generateSubGraph', arr, level);
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
            
            {parent.children.length ? <div className={styles.childrenWrapper} style={{position: 'relative'}}><hr style={{transform: 'rotate(90deg)', width: '20px'}}/>{childrenContent} </div> : null}
            {!parent.children.length ? <div className={styles.childrenWrapper}><button onClick={this.addAfterNode.bind(this, parent)}>Branch</button>
            <button onClick={this.addAfterNode.bind(this, parent)}>Node</button><button onClick={this.deleteNode.bind(this, parent)} style={{position: 'absolute', top: 20, left: 125}}>X</button>
            
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
            // const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
            const root = flowCopy.graph.nodes.find((node) => !flowCopy.graph.edges.find((edge) => edge.target === node.id));
           
            if (root) {
                // const arr = [[root]];
                const arr = [root];
                // console.log('I am groot', root);
                this.generateSubGraph(root);
                // console.log('firstlevel', root, arr);
                return root;
            }
  
            return null;
          }
          
      }

      render() {
          const {
              classes,
          } = this.props;

          console.log('Render flow', this.state)
          if (!this.props.flows.all[0]) {
              return <Loader />;
          }

          const graph = this.generateGraph();

          if (!graph) {
              return <Loader />;
          }
          const content = this.generateGraphVisualization([], graph, true);

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
                  {this.state.selectedNode && <div>Selected Node is: {this.state.selectedNode.id}</div>}
                  
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
