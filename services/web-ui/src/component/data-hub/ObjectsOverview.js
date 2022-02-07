import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';

const useStyles = {

};

function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

class ObjectsOverview extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const {
            classes, objs, type,
        } = this.props;

        const tags = [];
        // let averageScore = 0
        const scores = [];
        const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        if (objs.length > 0) {
            for (const obj of objs) {
                if (obj.enrichmentResults.tags) {
                    for (const tag of obj.enrichmentResults.tags) {
                        if (!tags.includes(tag)) {
                            tags.push(tag);
                        }
                    }
                }
                if (obj.enrichmentResults.score) {
                    scores.push(obj.enrichmentResults.score);
                }
            }
        }

        return (
            <Container className={classes.container}>
                <Paper style={{
                    paddingLeft: 20,
                    paddingRight: 10,
                    paddingTop: 5,
                    paddingBottom: 5,
                }}
                >
                    <h3>{type}</h3>
                    <p>Total: {objs.length} </p>
                    <p>Average score: {average(scores)}</p>
                    <p>Tags: {tags}</p>
                    <p>duplicates: {getRandomArbitrary(1, 4)} </p>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(ObjectsOverview);
