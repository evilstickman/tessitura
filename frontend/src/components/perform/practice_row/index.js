import React, { Component, useEffect, useState, useMatch } from "react";
import { useParams } from 'react-router-dom'

export default function PracticeRow(props) {
  
  //let params=useParams();
  //let rowData = params.rowData;
  
  let rowData = props.rowData;
  //-- fetch practice grids for user here and list 'em! -->
  return (
    <div>
      <tr>
        <td>{rowData.target_tempo}</td>
        <td>{rowData.start_measure}</td>
        <td>{rowData.end_measure}</td>
      </tr>
    </div>
  );
}