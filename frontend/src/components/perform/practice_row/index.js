import React, { Component, useEffect, useState, useMatch } from "react";
import { useParams } from 'react-router-dom'

import PracticeCell from "../practice_cell";

export default function PracticeRow(props) {
  const [cellData, setCellData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [placeholder, setPlaceholder] = useState("loading");
  let rowData = props.rowData;
  const [startMeasure, setStartMeasure] = useState(rowData.start_measure);
  const [endMeasure, setEndMeasure] = useState(rowData.end_measure);

  
  function triggerEditMode(event) {
    setEditing(!editing);
  }

  function updateRowStartData(event) {
    setStartMeasure(event.target.value);
  }

  function updateRowEndData(event) {
    setEndMeasure(event.target.value)
  }

  function commitRowDataSave(event) {
    event.preventDefault();
    setEditing(false);
    console.log("Updating row");
    let postBody = {
      "start_measure":startMeasure,
      "end_measure": endMeasure,
      "steps": rowData.steps,
      'target_tempo': rowData.target_tempo,
      'practice_grid_id': rowData.practice_grid_id
    }
    fetch("/perform/practice_row/" + rowData.id + "/", {
      method: 'PUT',
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
      setEditing(false);
      setLoaded(false);
    })
    .catch(err => {
      setPlaceholder(err.toString());
    });
  }

  function handleDeleteRow(event) {
    event.preventDefault();
    setEditing(false);
    console.log("Updating row");
    fetch("/perform/practice_row/" + rowData.id + "/", {
      method: 'DELETE',
      
    })      
    .then(response => {
      if (response.status > 400) {
        return setPlaceholder("Something went wrong!");
      }
      return response;
    })
    .then(data => {
      setEditing(false);
      setLoaded(false);
    })
    .catch(err => {
      console.error(err);
    });
  }

  useEffect(() => {
    if(rowData && !loaded) {
      fetch("/perform/practice_row/"+rowData.id+"/practice_cells/")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        data.sort((a,b) => a.target_tempo_percentage - b.target_tempo_percentage);
        setCellData(data);
        setLoaded(true);
      });
    }
  });
  //let params=useParams();
  //let rowData = params.rowData;
  //localhost:8000/perform/practice_row/530/practice_cells
  //-- fetch practice grids for user here and list 'em! -->
  return (
      <div className={['row', 'no-gutters',"border","border-dark"].join(' ')}>
          { editing && <form onSubmit={commitRowDataSave} className={["form-inline"].join(" ")}>
            <div className={["form-group","mb-2"].join(" ")}>
              <input type="text" value={startMeasure} onChange={updateRowStartData} />
              <input type="text" value={endMeasure}  onChange={updateRowEndData} />
              <input type="submit" value="Save" />
              <input type="button" value="Cancel" onClick={triggerEditMode}/>
              <input type="button" value="Delete" onClick={handleDeleteRow} />
            </div>
            </form>}
          {!editing && 
        <div className={["col"].join(" ")}>
          <div className="col" onClick={triggerEditMode}>{startMeasure}-{endMeasure}</div>
        </div>
          }
        { cellData && cellData.map( 
          (cell) => <PracticeCell key={'cell' + cell.id} cellData={cell} rowData={rowData}/>
        )}
      </div>
  );
}