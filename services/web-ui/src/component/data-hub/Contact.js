import React from 'react';
// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';

const useStyles = {

};

class DataHubContact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.container}>
              <Paper style={{
                paddingLeft: 20,
                paddingRight: 10,
                paddingTop: 5,
                paddingBottom: 5,
              }}
              >
                <h3>Contacts</h3>
                <p>Total: 518 </p>
                <p>Average score: 60 / 100</p>
                <p>Tags: private, company, finance, tech </p>
                <p>duplicates: 12 </p>
              </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubContact);
