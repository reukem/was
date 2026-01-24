import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import ChemistryLab from './src/ChemistryLab';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ChemistryLab />
  </React.StrictMode>
);
