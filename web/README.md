# logstation web

This folder contains the web application code that is served up by the logstation server and run the on the web clients.

In general, the connection between the server and client is via a websocket (mostly for passing up log lines), although some small elements are served up via a REST API, such as the logstation instance name. 

This part of logstation is written in React

Refer to [package.json](package.json) scripts for how to build and use. 
