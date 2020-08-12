import React, { Component } from "react";
import { render } from "react-dom";
import {Form, Button} from "react-bootstrap"

class EnsembleItem extends Component {

  render() {
    const {ensemble, createMode} = this.props;
    console.log("Rendering EnsembleItem");
    if(createMode) {
      console.log("Create mode engaged");
      return (
        <Form>
          <Form.Group controlId="formBasicEmail">
            <Form.Label>Email address</Form.Label>
            <Form.Control type="email" placeholder="Enter email" />
            <Form.Text className="text-muted">
              We'll never share your email with anyone else.
            </Form.Text>
          </Form.Group>

          <Form.Group controlId="formBasicPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Password" />
          </Form.Group>
          <Form.Group controlId="formBasicCheckbox">
            <Form.Check type="checkbox" label="Check me out" />
          </Form.Group>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
      );
    }
    else {
      if(!ensemble)
      {
        return null;
      }
      return (
          <div key={ensemble.id} className="list-group-item">
            {ensemble.name} - {ensemble.address} - {ensemble.conductor}
          </div>
      );
    }
    
  }
}

export default EnsembleItem;

const container = document.getElementById("app");
render(<EnsembleItem />, container);
