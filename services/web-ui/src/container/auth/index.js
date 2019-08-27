import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import flow from 'lodash/flow';
import { withStyles } from '@material-ui/styles';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';
import Grid from '@material-ui/core/Grid';

// Components
import Loader from '../../component/loader';
// Actions
import { login } from '../../action/auth';

const useStyles = {
    logo: {
        padding: '10vh 0',
        margin: 'auto',
        width: 300,
    },
    form: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    formControl: {
        margin: '10px',
    },
};

class Auth extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            userData: {
                username: process.env.REACT_APP_DEFAULT_USERNAME || '',
                password: process.env.REACT_APP_DEFAULT_PASSWORD || '',
            },
            pending: false,
        };
        if (this.props.auth.isLoggedIn) this.props.history.push('/');
    }

    componentDidUpdate(prevProps) {
        if (this.props.auth !== prevProps.auth && this.props.auth.isLoggedIn) {
            this.props.history.push('/');
        }
    }

  setVal = (fieldName, e) => {
      this.setState({
          userData: update(this.state.userData, {
              [fieldName]: {
                  $set: e.target.value,
              },
          }),
      });
  };

  login = async (e) => {
      e.preventDefault();
      this.setState({
          pending: true,
      });
      await this.props.login(this.state.userData);
  };

  render() {
      const { classes } = this.props;
      if (this.state.pending) {
          return (
              <Loader />
          );
      }

      return (
          <Grid
              container
              spacing={0}
              direction="column"
              alignItems="center"
              justify="center"
              style={{ minHeight: '50vh' }}
          >

              <Grid item xs={3}>
                  <img
                      className={classes.logo}
                      src="https://www.openintegrationhub.org/wp-content/uploads/2018/07/small-oih-bildmarke.png"
                      alt="Open Integration Hub"
                      id="logo"
                  />

                  <form onSubmit={this.login} className={classes.form}>
                      <div>
                          <FormControl className={classes.formControl} fullWidth required>
                              <InputLabel htmlFor="username">username</InputLabel>
                              <Input id="username" name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username}/>
                          </FormControl>
                          <FormControl className={classes.formControl} fullWidth required>
                              <InputLabel htmlFor="password">password</InputLabel>
                              <Input id="password" type="password" name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.password}/>
                          </FormControl>
                          <FormControl className={classes.formControl} fullWidth>
                              <Button type='submit' variant="contained" color="secondary">Login</Button>
                          </FormControl>
                      </div>

                  </form>
              </Grid>
          </Grid>
      );
  }
}

Auth.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
    auth: state.auth,
});

const mapDispatchToProps = dispatch => bindActionCreators({
    login,
}, dispatch);

export default flow(
    withStyles(useStyles),
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),

    withRouter,
)(Auth);
