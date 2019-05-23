import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import flow from 'lodash/flow';
// import classNames from 'classnames';
import { withStyles } from '@material-ui/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';
import CircularProgress from '@material-ui/core/CircularProgress'; import Grid from '@material-ui/core/Grid';
import { login } from '../../action/user';

const useStyles = {
    loginContainer: {
        flexGrow: 1,
    },
    form: {
        float: 'none',
        margin: 'auto',
        padding: '40vh 0',
        width: 200,
    },
    loading: {
        padding: '40vh 0',
        height: '100vh',
    },
    frame: {
        height: '100vh',
    },
    formGroup: {
        padding: '30px 0 0 0 ',
    },
};

class Auth extends React.Component {
  state = {
      userData: {
          username: process.env.REACT_APP_DEFAULT_USERNAME || '',
          password: process.env.REACT_APP_DEFAULT_PASSWORD || '',
      },
      pending: false,
  }

  componentDidUpdate(prevProps) {
      if (this.props.user !== prevProps.user && this.props.user.isLoggedIn) {
          this.props.history.push('/');
      }
      // if (prevProps.tokenInvalid !== this.props.tokenInvalid) {
      //     this.setState({
      //         isLoggedIn: false,
      //     });
      // }
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
              <div className={classes.loginContainer}>
                  <div className={classes.loading}>
                      <CircularProgress size={200} color="secondary" style={{ marginLeft: '45%' }}/>
                  </div>

              </div>
          );
      }

      return (
          <div className={classes.loginContainer}>
              <Grid container >
                  <Grid item xs={4}>
                      <div></div>
                  </Grid>
                  <Grid item xs={4}>
                      <div className={classes.frame}>
                          <form onSubmit={this.login.bind(this)} className={classes.form}>
                              <FormGroup className={classes.formGroup}>
                                  <FormLabel htmlFor="username">username</FormLabel>
                                  <Input id="username" name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username} />
                              </FormGroup>
                              <FormGroup className={classes.formGroup}>
                                  <FormLabel htmlFor="password">password</FormLabel>
                                  <Input id="password" type="password" name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.password} />
                              </FormGroup>
                              <FormGroup className={classes.formGroup}>
                                  <Button type='submit' variant="contained" color="secondary">Login</Button>
                              </FormGroup>
                          </form>
                      </div>
                  </Grid>
                  <Grid item xs={4}>
                      <div></div>
                  </Grid>
              </Grid>

          </div>
      );
  }
}

Auth.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
    user: state.user,
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
