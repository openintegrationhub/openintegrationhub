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
        border: '1px solid blue',
        margin: 20,
        padding: 20,
    },
    flowElement: {
        border: '1px solid red',
    },

};

class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        props.getFlows();
        this.state = {
            position: '',
            loading: true,
        };
    }

    onElementClick = (element) => {
        console.log('onElementClick', element);
        this.props.onEditNode && this.props.onEditNode(element.id);
    }

  addAfterNode = (parent) => {
      const graph = { ...this.props.flows.all[0].graph };
      const newNodeId = `step_${Math.round(Math.random() * 987654)}`;
      graph.nodes.push({
          id: newNodeId,
          componentId: null,
          function: null,
          fields: {
          },
          nodeSettings: {
              basaasFlows: {
                  appRef: null,
                  methodType: null,
                  integratedApp: null,
                  stepName: 'Please select app',
                  inputDataMapping: {

                  },
              },
          },
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

      this.setState({
          flow: {
              ...this.props.flows.all[0],
              graph,
          },
      });
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
            <p onClick={this.onElementClick.bind(this, parent)}>{(parent.nodeSettings && parent.nodeSettings.basaasFlows ? parent.nodeSettings.basaasFlows.stepName : parent.id)}</p>
            <button onClick={this.addAfterNode.bind(this, parent)}>+</button>
            {parent.children.length ? <div className={styles.childrenWrapper}>{childrenContent}</div> : null}
        </div>);

        return currentContent;
    }

      generateSubGraph = (parent) => {
          const children = this.props.flows.all[0].graph.nodes.filter((node) => this.props.flows.all[0].graph.edges.find((edge) => edge.source === parent.id && edge.target === node.id));
          parent.children = children || [];
          for (const childNode of parent.children) {
              this.generateSubGraph(childNode);
          }

          return parent;
      }

      generateGraph = () => {
          // const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
          const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
          console.log('root is', root);
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

      render() {
          const {
              classes,
          } = this.props;

          // const { id } = useParams();
          console.log('props is', this.props);

          if (!this.props.flows.all[0]) {
              return <Loader />;
          }

          const graph = this.generateGraph();

          console.log('Graph is', graph);
          if (!graph) {
              return <Loader />;
          }
          console.log('Flow', this.props.flows.all[0]);
          const content = this.generateGraphVisualization([], graph, true);

          const { id } = this.props.match.params;
          console.log('Id', id);
          return (

              <div>
                  <h2>{this.props.flows.all[0].name}</h2>
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

                  </div>
                  {content}
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
