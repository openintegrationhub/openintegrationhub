import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';

const useStyles = {

};

class DataHubDocument extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        const {
            classes,
            documents,
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
                    <h3>Documents</h3>
                    <p>Total: {documents.length}</p>
                    <p>Average score: 48 / 100</p>
                    <p>Tags: project, contract, organization, system </p>
                    <p>duplicates: 29 </p>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubDocument);
