import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import LogViewer from './LogViewer';
// import reportWebVitals from './reportWebVitals';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00ff78',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#455a64',
            contrastText: '#ffffff'
        }
    },
});

ReactDOM.render(
  <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <LogViewer />
      </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
