import React, { Component } from "react";
import { 
  BrowserRouter, 
  Routes, 
  Route,
  Link,
} from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { Nav, Navbar, NavItem } from "react-bootstrap";
import EnsembleList from "./EnsembleList"
import MusicianList from "./MusicianList"
import Perform from "./perform"

function Home() {
  return (

    <h1>Home</h1>
  )
}
class App extends Component {
  render() {
    return (
      
      <BrowserRouter>
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
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/ensembles/*" element={<EnsembleList />} />
          <Route path="/musicians/*" element={<MusicianList />} />
          <Route path="/perform/*" element={<Perform />} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App />);