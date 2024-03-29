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
            <Navbar.Brand href="/performance_support">Tessitura</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="mr-auto">
                <NavItem eventkey={1} href="/performance_support">
                  <Link to='/performance_support' className='nav-link'>Performance Support Tools</Link>
                </NavItem>
                <NavItem eventkey={2} href="/ensembles">
                  <Link to="/ensembles" className="nav-link">Ensembles</Link>
                </NavItem>
                <NavItem eventkey={3} href="/musicians">
                  <Link to="/musicians" className="nav-link">Musicians</Link>
                </NavItem>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>  
        <Routes>
          <Route path="/" element={<Perform />} />
          <Route path="/ensembles/*" element={<EnsembleList />} />
          <Route path="/musicians/*" element={<MusicianList />} />
          <Route path="/performance_support/*" element={<Perform />} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App />);