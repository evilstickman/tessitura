import React, { Component, useEffect, useState, useMatch } from "react";
import { createRoot } from 'react-dom/client'
import { useParams } from 'react-router-dom'

export default function PracticeGrid() {
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState("Loading");
  const [path, setPath] = useState("");
  let params=useParams();
  let gridId = params.gridId;
  
  useEffect(() => {
    if(gridId && !loaded) {
      fetch("/perform/practice_grid/"+gridId+"/practice_rows")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setData(data);
        setLoaded(true);
      });
    }
  });
  //-- fetch practice grids for user here and list 'em! -->
  return (
    <div className="container">
      <div id='practice-grid-detail'>
        <h1>Practice grid detail</h1>
        { data && (
          <div>{data.toString()}</div>
        )}
      </div>
    </div>
  );
  
}