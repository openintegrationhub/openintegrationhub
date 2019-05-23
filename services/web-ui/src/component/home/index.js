import React from 'react';
import PropTypes from 'prop-types';
import flow from 'lodash/flow';
import { withStyles } from '@material-ui/styles';

const useStyles = {
    container: {
        float: 'none',
        margin: 'auto',
        padding: '15vh 25vw 10vh 25vw',
        backgroundImage: 'url(https://www.openintegrationhub.org/wp-content/uploads/2018/06/headergrafik-1440-x-684-px.jpg)!important',
        backgroundPosition: 'bottom center',
        backgroundRepeat: 'no-repeat',
    },
    headline: {
        fontSize: '54px',
        lineHeight: '52px',
        textShadow: '0em 0.03em 0.1em rgba(0,0,0,0.08)',
        color: '#fff!important',
    },
    content: {
        fontSize: '24px',
        lineHeight: '1.33em',
        color: '#fff!important',
    },
    wrapper: {
        fontSize: '24px',
        lineHeight: '1.33em',
        color: '#fff!important',
    },
};

class Home extends React.Component {
    render() {
        const { classes } = this.props;
        return (
            <div className={classes.wrapper}>
                <div className={classes.container}>
                    <h1 className={classes.headline}>
                    Die Revolution der Daten-Synchronisation
                    </h1>
                    <span className={classes.content}>
                Open Source Framework zum standardisierten Datenaustausch zwischen Geschäftsanwendungen.
                    </span>

                </div>
            </div>

        );
    }
}

Home.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default flow(
    withStyles(useStyles),
)(Home);
