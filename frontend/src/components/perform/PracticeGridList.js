import React, { Component } from "react";
import { Col, Row, Card } from "react-bootstrap";
import { createRoot } from 'react-dom/client'
import PracticeGridListItem from './PracticeGridListItem'

class PracticeGridList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loaded: false,
      placeholder: "Loading",
      path: '',
      name: '',
      notes: '',
    };

    this.changeName = this.changeName.bind(this);
    this.changeNotes = this.changeNotes.bind(this);
    this.createNewGrid = this.createNewGrid.bind(this);
    this.fetchGridList = this.fetchGridList.bind(this);
    this.onDeleteGrid = this.onDeleteGrid.bind(this);
    this.refreshList = this.refreshList.bind(this);
  }

  fetchGridList() {
    let {match} = this.props;
    fetch("/perform/practice_grid")
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

  componentDidMount() {
    this.fetchGridList()
  }

  createNewGrid(event) {
    event.preventDefault();
    console.log("Creating a new grid");
    let postBody = {
      "name": this.state.name,
      "notes": this.state.notes
    }
    fetch("/perform/practice_grid/", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody)

    })      
    .then(response => {
      if (response.status > 400) {
        return setPlaceholder("Something went wrong!");
      }
      return response.json();
    })
    .then(data => {
      
      this.setState(() => {
        return {
          data: [],
          loaded: false,
          name: '',
          notes: ''
        };
      });
      // Trigger a refresh of the cell, ideally
      this.fetchGridList();
    });
  }

  changeName(event) {
    this.setState({
      name: event.target.value
    });
  }

  changeNotes(event) {
    this.setState({
      notes: event.target.value
    });
  }

  onDeleteGrid(event) {
    event.preventDefault();
    console.log("Deleting a grid");
    fetch("/perform/practice_grid/" + event.target.getAttribute('data-grid-id') + "/", {method: 'DELETE'})      
    .then(response => {
      if (response.status > 400) {
        return setPlaceholder("Something went wrong!");
      }
      return response;
    })
    .then(data => {
      this.setState(() => {
        return {
          data: [],
          loaded: false,
          name: '',
          notes: ''
        };
      });
      // Trigger a refresh of the cell, ideally
      this.fetchGridList();
    });
  }

  refreshList() {
    this.fetchGridList();
  }

  render() {
    const { path } = this.state;
    return (
        <div className="container">
          <Card
          bg='light'
          key='light'
          text='dark'
          border='dark'>
            <Card.Header><strong>Create a new Grid:</strong></Card.Header>
            <Card.Body>
            <form onSubmit={this.createNewGrid}>
              <div className="form-group">
              <label>
                Name:
                <input className="form-control" type='text' defaultValue={this.state.name} onChange={this.changeName}/>
              </label>
              <label>
                Notes:
                <input className="form-control" type='area' defaultValue={this.state.notes} onChange={this.changeNotes}/>
              </label>
              <input type="submit" value="Submit" />
              </div>
            </form>
            </Card.Body>
          </Card>
          
          <br />
          <Row xs={1} md={2} className="g-4">
            {this.state.data && this.state.data.map(practiceGrid => {
              return (
                <Col key={'col-'+practiceGrid.id}>                  
                  <PracticeGridListItem key={"practice-grid-list-"+practiceGrid.id } practiceGrid={practiceGrid}  id={practiceGrid['id']} callback={this.refreshList} />
                </Col>
              );
            })}
          </Row>
        </div>
    );
  }
}

export default PracticeGridList;
