import React from 'react';
import flow from 'lodash/flow';

import PropTypes from 'prop-types';
import SwipeableViews from 'react-swipeable-views';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import TextField from '@material-ui/core/TextField';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import PieChart from './PieChart';
import MultiAxisLineChart from './MultiAxisLineChart';
import DataQuality from './DataQuality';
import dataJSON from './data.json';
// actions
import {
    getDataObjects,
    // plain
    enrichData,
} from '../../action/data-hub';

function TabPanel(props) {
    const {
        children, value, index, ...other
    } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

const useStyles = {

    formControl: {
        minWidth: 120,
    },
    input: {
        height: '48px',
    },
    submitBtn: {
        height: '48px',
    },
};

class DataHub extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            openTab: 0,
        };
        props.getDataObjects();
    }

    async componentDidMount() {
        await enrichData();
    }

    handleChange = (event, newValue) => {
        this.setState({ openTab: newValue });
    };

     handleChangeIndex = (index) => {
         this.setState({ openTab: index });
     };

     render() {
         const {
             classes,
         } = this.props;
         switch (this.state.sortBy) {
         case 'duplicatesDesc':
             dataJSON.data.sort((a, b) => b.enrichmentResults.knownDuplicates.length - a.enrichmentResults.knownDuplicates.length);
             break;
         case 'duplicatesAsc':
             dataJSON.data.sort((a, b) => a.enrichmentResults.knownDuplicates.length - b.enrichmentResults.knownDuplicates.length);
             break;
         case 'scoreDesc':
             dataJSON.data.sort((a, b) => b.enrichmentResults.score - a.enrichmentResults.score);
             break;
         case 'scoreAsc':
             dataJSON.data.sort((a, b) => a.enrichmentResults.score - b.enrichmentResults.score);
             break;
         default:
             break;
         }

         return (
             <Container className={classes.container}>

                 <div className={classes.root}>
                     <AppBar position="static" color="default">
                         <Tabs
                             value={this.state.openTab}
                             onChange={this.handleChange}
                             indicatorColor="primary"
                             textColor="primary"
                             variant="fullWidth"
                             aria-label="full width tabs example"
                         >
                             <Tab label="RDS" />
                             <Tab label="Data-Quality" />
                             <Tab label="Search" />
                         </Tabs>
                     </AppBar>
                     <SwipeableViews
                         axis='x'
                         index={this.state.openTab}
                         onChangeIndex={this.handleChangeIndex}
                     >
                         {/** RDS */}
                         <TabPanel value={this.state.openTab} index={0} dir='x'>
                             <PieChart />
                             <MultiAxisLineChart/>
                         </TabPanel>
                         {/** Data quality */}
                         <TabPanel value={this.state.openTab} index={1} dir='x'>
                             <button>Enrich Data</button>
                             <DataQuality/>
                         </TabPanel>
                         {/** search query */}
                         <TabPanel value={this.state.openTab} index={2} dir='x'>
                             {/* <form className={classes.root} noValidate autoComplete="off"> */}
                             <TextField id="outlined-basic" label="Search" variant="outlined" />
                             {/* </form> */}
                         </TabPanel>
                     </SwipeableViews>
                 </div>
                 <Tab/>

             </Container>
         );
     }
}

const mapStateToProps = (state) => ({
    dataHub: state.dataHub,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getDataObjects,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(DataHub);
