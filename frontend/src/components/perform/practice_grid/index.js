import React, { useEffect, useState } from "react";
import { Accordion } from "react-bootstrap";
import AccordionItem from "react-bootstrap/esm/AccordionItem";
import { useParams } from 'react-router-dom'
import PracticeRow  from "../practice_row";

export default function PracticeGrid() {
  const [rowData, setRowData] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState("Loading");

  let params=useParams();
  let gridId = params.gridId;
  const [cellCompletionsByCellId, setCompletionsByCellId] = useState({})
  const [cellsByRowId, setCellsByRowId] = useState({})
  const [name, setName] = useState(gridData.name);
  const [notes, setNotes] = useState(gridData.notes);

  const [target, setTarget] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [steps, setSteps] = useState("")

  function onEditTargetTempo(event) {
    setTarget(event.target.value);
  }
  
  function onEditStart(event) {
    setStart(event.target.value);
  }
  
  function onEditEnd(event) {

    setEnd(event.target.value);
  }
  
  function onEditSteps(event) {

    setSteps(event.target.value);
  }

  function onAddRow(event) {
    event.preventDefault();
    console.log(target, start, end, steps)

    event.preventDefault();
    console.log("Adding a new row");
    let postBody = {
      "practice_grid_id":gridId,
      "target_tempo": target,
      "start_measure": start,
      "end_measure": end,
      "steps": steps
    }
    fetch("/perform/practice_row/", {
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
      setLoaded(false);
    })
    .catch(err => {
      setPlaceholder(err.toString());
    });





  }

  function onEditName(event) {

  }

  function onEditNotes(event) {

  }

  function onEditGrid() {

  }
  
  useEffect(() => {
    if(gridId && !loaded) {
      fetch("/perform/practice_grid/"+gridId)
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setGridData(data);
        setLoaded(true);
      });
      fetch("/perform/practice_grid/"+gridId+"/practice_rows/")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setRowData(data);
        setLoaded(true);
      });
    }
  });
  //-- fetch practice grids for user here and list 'em! -->
  return (
    <div id='practice-grid-detail'>
      <Accordion>
        <Accordion.Item eventKey="0">
          <Accordion.Header>
              Add new row
          </Accordion.Header>
          <Accordion.Body>
              <div className="row">
                <div className="col">
                  <form onSubmit={onAddRow}>
                    <input id="target-tempo" type="text" className="form-control" placeholder="BPM" onChange={onEditTargetTempo} />
                    <input id="start-row" type="text" className="form-control" placeholder="start" onChange={onEditStart}/>
                    <input id="end-row" type="text" className="form-control" placeholder="end" onChange={onEditEnd} />
                    <input id="steps-row" type="text" className="form-control" placeholder="steps" onChange={onEditSteps} />
                    <input id="add-row-btn" type="submit" className={['btn','btn-primary'].join(" ")} value="Add Row" />
                  </form>
                </div>
              </div>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>
              Edit Grid Details
          </Accordion.Header>
          <Accordion.Body>
                  <form>
                    <input id="grid-name" type="text" className="form-control" defaultValue={gridData.name} />
                    <input id="grid-notes" type="text" className="form-control" placeholder={gridData.notes} />
                  </form>
            </Accordion.Body>  
        </Accordion.Item>
        
      </Accordion>
      <div>
        {!loaded && <h2>{placeholder}</h2>}
      </div>
      {loaded && (
        <div>
        <h2>Grid Name: {gridData && gridData.name}</h2>
        <p><strong>Description:</strong> {gridData && gridData.notes}</p>
        <p><em><small>Instructions: left-click a cell to mark a cell complete. Right click to clear completion data. click on the measure numbers to update or delete row data. Use the new row form to add additional rows. Steps are the number of steps between 55% of tempo and target tempo, inclusive, and provided as metronome markings.</small></em></p>
        <p><em><small>Note - this is alpha software, and buggy. If a right click doesn't register, just try again. If you try to refresh the page, it's going to fail (conflict between django and react I haven't fixed yet). The format is also likely to change at the drop of a hat. Please send me your feedback! I would love to make this more useful!</small></em></p>
        <div className="practiceGridField">
          <div className="container-fluid">
            <div className="row">
              <div className="col-1">Measures</div>
            </div>
            { rowData.map ( (row) => <PracticeRow key={'row' + row.id} rowData={row} /> )}
            
          </div>
        </div>
      </div>
      )}
    </div>
  );
  
}