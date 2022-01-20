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
import {
    getFlows, deleteFlow, updateFlow, startFlow, stopFlow, executeFlow,
} from '../../../action/flows';
import OIHFlow from './oihFlowStructure.json';

const useStyles = {
    flowContainer: {
        width: '98%',
        height: '90vh',
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

    generateGraphVisualization = (currentContent = [], parent, isRoot, nodeAlignment) => {
        const childrenContent = [];

        // if (parent.children.length) {
        //     childrenContent
        // }

        console.log(currentContent, parent);

        // for (const node of parent.children) {
        //     childrenContent.push(this.generateGraphVisualization([], node));
        // }
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
          // const root = this.state.flow.graph.nodes.find((node) => !this.state.flow.graph.edges.find((edge) => edge.target === node.id));
          const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
          console.log('root is', root);
          if (root) {
              // const arr = [[root]];
              const arr = [root];
              // console.log('I am groot', root);
              this.generateSubGraph(root);
              console.log('firstlevel', root, arr);
              return root;
          }

          return null;
      }

      render() {
          const {
              classes,
          } = this.props;

          console.log('FLow is', this.props.flows.all[0]);
          console.log('OIH flow structure:', OIHFlow);
          // if (this.props.flows.all[0].length > 1) {
          //     const graph = this.generateGraph();
          //     console.log('Graph is:', graph);
          // }

          // if (!graph) {
          //     return null;
          // }
          // const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
          // console.log('Root', root);

          if (this.props.flows.all[0]) {
              // const root = this.props.flows.all[0].graph.nodes.find((node) => !this.props.flows.all[0].graph.edges.find((edge) => edge.target === node.id));
              // console.log('Item is', root);
              const graph = this.generateGraph();
              console.log('Graph is:', graph);
              // const content = this.generateGraphVisualization([], graph, true);
          }

          // const root = this.props.flows.all[0].graph.nodes.map((item) => console.log(item));

          // console.log('state?', this.state.flow);
          return (
              <Grid item xs={12}>
                  <div className={classes.flowContainer}>
                      <div className={classes.flowNode}>
                          <p>Node 1</p>
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

              </Grid>
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

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowDetails);
