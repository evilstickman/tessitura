import React, { Component } from "react";
import { render } from "react-dom";
import {
  Switch,
  Route,
  Link,
  withRouter,
  BrowserRouter as Router
} from "react-router-dom"
import EnsembleItem from './EnsembleItem'


class EnsembleList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loaded: false,
      placeholder: "Loading",
      path: ''
    };
  }

  componentDidMount() {
    let {match} = this.props;
    fetch("coordinate/ensemble")
      .then(response => {
        if (response.status > 400) {
          return this.setState(() => {
            return { placeholder: "Something went wrong!" };
          });
        }
        return response.json();
      })
      .then(data => {
        if(match)
        {
          this.setState(() => {
            return {
              data,
              loaded: true,
              path: match.path
            };
          });
        }
        else
        {
          
          this.setState(() => {
            return {
              data,
              loaded: true,
              path: ''
            };
          });
        }
      });
  }

  render() {
    const { path } = this.state;
    console.log(this.props.match);
    return (
      <Router>
        <div className="container">
          <div className="row">
            <h1>Manage ensembles</h1>
          </div>
          <div className="row">
            <Switch>
              <Route path={`${path}/create`}>
                <EnsembleItem createMode={true} />
              </Route>
              <Route path={path}>
                {this.state.data && this.state.data.map(ensemble => {
                  return (
                      <EnsembleItem ensemble={ensemble} createMode={false}  id="ensembleListContainer" />
                  );
                })}
                <Link to={`${path}/create`} className="nav-link" id="createEnsembleLink">Create a new Ensemble</Link>
                <Link to="/home" className="nav-link">Home</Link>
              </Route>
            </Switch>
          </div>
        </div>
      </Router>
    );
  }
}

export default withRouter(EnsembleList);

const container = document.getElementById("app");
render(<EnsembleList />, container);
