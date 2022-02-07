import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';

const useStyles = {

};

class DataHubProduct extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const {
            classes,
            products,
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
                    <h3>Products</h3>
                    <p>Total: {products.length}</p>
                    <p>Average score: 72 / 100</p>
                    <p>Tags: furniture, web, toys, cars </p>
                    <p>duplicates: 2 </p>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubProduct);
