# logstation web

This folder contains the web application code that is served up by the logstation server and run the on the web clients.

In general, the connection between the server and client is via a websocket (mostly for passing up log lines), although some small elements are served up via a REST API, such as the logstation instance name. 

This part of logstation is written in React.

## Available Scripts
Refer to [package.json](package.json) for details on the available scripts.

Yarn is used as the package manager and parcel as the build tool.


### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:1234](http://localhost:1234) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.



