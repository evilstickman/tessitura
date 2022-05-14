import React, { Component } from "react";
import { render } from "react-dom";
import { 
  BrowserRouter as Router, 
  Switch, 
  Route,
  Link
} from 'react-router-dom'
import { Nav, Navbar, NavItem, NavDropdown, Form,FormControl,Button } from "react-bootstrap";
import EnsembleList from "./EnsembleList"
import MusicianList from "./MusicianList"
import Perform from "./perform"


class App extends Component {
  render() {
    return (
      
      <Router>
        <div>
          <Navbar bg="light" expand="lg">
            <Navbar.Brand href="/home">Tessitura</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="mr-auto">
                <NavItem eventkey={1} href="/">
                  <Link to="/home" className="nav-link">Home</Link>
                </NavItem>
                <NavItem eventkey={2} href="/ensembles">
                  <Link to="/ensembles" className="nav-link">Ensembles</Link>
                </NavItem>
                <NavItem eventkey={3} href="/musicians">
                  <Link to="/musicians" className="nav-link">Musicians</Link>
                </NavItem>
                <NavItem eventKey={4} href="/perform">
                  <Link to='/perform' className='nav-link'>Performance Support Tools</Link>
                </NavItem>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>  
        <Switch>
          <Route path="/home">
            <h1>Home</h1>
          </Route>
          <Route path="/ensembles">
            <EnsembleList />
          </Route>
          <Route path="/musicians">
            <MusicianList />
          </Route>
          <Route path="/perform">
            <Perform />
          </Route>
        </Switch>
      </Router>
    );
  }
}

export default App;

const container = document.getElementById("app");
render(<App />, container);