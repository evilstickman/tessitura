import React, { Component } from "react";
import {Form, Button} from "react-bootstrap"
import { createRoot } from 'react-dom/client'

class EnsembleItem extends Component {

  handleCreateClick(event) {
    event.preventDefault();
    let form=event.target;

    let new_ensemble = {
      name: form.elements.formEnsembleName.value,
      address: form.elements.formEnsembleAddress.value,
      administrator: form.elements.formEnsembleAdministrator.value,
      conductor: form.elements.formEnsembleCoordinator.value,
      users: [2]

    }
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(new_ensemble)
    }
    fetch("http://tessitura.herokuapp.com/coordinate/ensemble", requestOptions)
      .then(response => response.json())
      .then(data => console.log(data));
      
  }

  render() {
    const {ensemble, createMode} = this.props;
    if(createMode) {
      return (
        <Form onSubmit={this.handleCreateClick}>
          <Form.Group controlId="formEnsembleName">
            <Form.Label>Ensemble Name</Form.Label>
            <Form.Control type="text" placeholder="Enter name" />
          </Form.Group>

          <Form.Group controlId="formEnsembleAddress">
            <Form.Label>Mailing address</Form.Label>
            <Form.Control type="text" placeholder="Address" />
          </Form.Group>

          <Form.Group controlId="formEnsembleAdministrator">
            <Form.Label>Ensemble Administrator ID</Form.Label>
            <Form.Control type="text" placeholder="1" />
          </Form.Group>

          <Form.Group controlId="formEnsembleCoordinator">
            <Form.Label>Ensemble Coordinator ID</Form.Label>
            <Form.Control type="text" placeholder="1" />
          </Form.Group>
          
          <Button variant="primary" type="submit" id="formEnsembleSubmitButton">
            Create
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

