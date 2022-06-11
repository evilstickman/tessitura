import React, { Component } from "react";
import { Button, Card, ListGroup, ListGroupItem } from "react-bootstrap";
import { 
  Link,
  useParams
} from 'react-router-dom'


export default function PracticeGridListItem(props) {
    let practiceGrid = props.practiceGrid;
    let callback = props.callback;

    function onDeleteGrid(event) {
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
        callback();
      })
    }
    return (
      <div className="practiceGridDetail">
        
        { practiceGrid &&
          <div>
          <Card
            border="dark">
            <Card.Header>{practiceGrid['name']}</Card.Header>
            <Card.Body>
              <Card.Text>
                {practiceGrid.notes}
              </Card.Text>
              
            </Card.Body>
            <Card.Footer>
              <div className="inline-flex">
                <Link to={'/performance_support/practice_grid_display/' + practiceGrid['id']+ '/' } className='nav-link'>Open</Link>
                <Button type="button" onClick={onDeleteGrid} data-grid-id={practiceGrid.id} className={['align-self-end','btn-danger'].join(" ") } >Delete</Button>
              </div>
              </Card.Footer>
          </Card>
          </div>
        }
      </div>
    );
}

