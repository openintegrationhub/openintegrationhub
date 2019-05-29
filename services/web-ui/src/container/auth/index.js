import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import flow from 'lodash/flow';
import { withStyles } from '@material-ui/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';
import Grid from '@material-ui/core/Grid';
// Components
import Loader from '../../component/loader';
// Actions
import { login } from '../../action/auth';

const useStyles = {
    loginContainer: {
        flexGrow: 1,
    },
    form: {
        margin: 'auto',
        padding: '30vh 0',
        width: 200,
    },
    frame: {
        height: '90vh',
    },
    formGroup: {
        padding: '30px 0 0 0 ',
    },
    logo: {
        position: 'inherit',
        backgroundImage: 'linear-gradient(73deg, #ff8200, #ff2473)',
    },
};

class Auth extends React.Component {
  state = {
      userData: {
          username: process.env.REACT_APP_DEFAULT_USERNAME || '',
          password: process.env.REACT_APP_DEFAULT_PASSWORD || '',
      },
      pending: true,
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
          <div className={classes.loginContainer}>
              <Grid container >
                  <Grid item xs={4}></Grid>
                  <Grid item xs={4}>
                      <Card className={classes.frame}>
                          <div className={classes.logo}>
                              <img
                                  src="https://www.openintegrationhub.org/wp-content/uploads/2018/07/oih-logo.svg"
                                  alt="Open Integration Hub"
                                  id="logo"
                                  data-height-percentage="240"
                              />

                          </div>

                          <form onSubmit={this.login.bind(this)} className={classes.form}>
                              <FormGroup className={classes.formGroup}>
                                  <FormLabel htmlFor="username">username</FormLabel>
                                  <Input id="username" name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username} required/>
                              </FormGroup>
                              <FormGroup className={classes.formGroup}>
                                  <FormLabel htmlFor="password">password</FormLabel>
                                  <Input id="password" type="password" name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.password} required/>
                              </FormGroup>
                              <FormGroup className={classes.formGroup}>
                                  <Button type='submit' variant="contained" color="secondary">Login</Button>
                              </FormGroup>
                          </form>
                      </Card>
                  </Grid>
                  <Grid item xs={4}></Grid>
              </Grid>

          </div>
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
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withRouter,
)(Auth);
