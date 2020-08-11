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
      placeholder: "Loading"
    };
  }

  componentDidMount() {
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
        this.setState(() => {
          return {
            data,
            loaded: true
          };
        });
      });
  }

  render() {
    const { match } = this.props;
    return (
      <Router>
        <div className="container">
          <div className="row">
            <h1>Manage ensembles</h1>
          </div>
          <div className="row">
            <Switch>
              <Route path='/ensemble/create'>
                <EnsembleItem createMode={true} />
              </Route>
              <Route path="/">
                {this.state.data.map(ensemble => {
                  return (
                      <EnsembleItem ensemble={ensemble} createMode={false} />
                  );
                })}
                <Link to="/ensemble/create" className="nav-link">Create a new Ensemble</Link>
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
