import React, { Component } from "react";
import { render } from "react-dom";
import { 
  BrowserRouter as Router, 
  Switch, 
  Route,
  Link
} from 'react-router-dom'
import { Nav, Navbar, NavItem, NavDropdown, Form,FormControl,Button } from "react-bootstrap";

class Navigation extends Component {

  render() {
    return (
      <div>

        
      </div>
    );
  }
}

export default Navigation;

const container = document.getElementById("app");
render(<Navigation />, container);