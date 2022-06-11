import React, { Component } from "react";
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

  render() {
    const { path } = this.state;
    return (
        <div className="container">
          <div className="row">
            <ul className="list-group">
              {this.state.data && this.state.data.map(practiceGrid => {
                return (
                  <div className="list-group-item">
                    <PracticeGridListItem key={"liparent+"+practiceGrid.id } practiceGrid={practiceGrid}  id={practiceGrid['id']} />
                    <input type="button" onClick={this.onDeleteGrid} data-grid-id={practiceGrid.id} value="Delete" />
                  </div>
                );
              })}
            </ul>
          </div>
          <div>
            <h3>Create a new Grid:</h3>
            <form onSubmit={this.createNewGrid}>
              <label>
                Name:
                <input type='text' defaultValue={this.state.name} onChange={this.changeName}/>
              </label>
              <label>
                Notes:
                <input type='text' defaultValue={this.state.notes} onChange={this.changeNotes}/>
              </label>
              <input type="submit" value="Submit" />
            </form>
          </div>
        </div>
    );
  }
}

export default PracticeGridList;
