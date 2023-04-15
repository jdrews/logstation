import ReconnectingWebSocket from "reconnecting-websocket";
import MainLayout from "./MainLayout";
import { useEffect, useState } from "react";

const wsurl = "ws://" + window.location.host + "/ws";
const url = window.location.protocol + "//" + window.location.host;

const rws = new ReconnectingWebSocket(wsurl);

const App = () => {
  const [logFiles, setLogFiles] = useState(new Map());

  useEffect(() => {
    connect();
  });

  function connect() {
    rws.onopen = () => {
      console.log("WebSocket Connected");
      fetch(url + "/settings/logstation-name")
        .then((response) => response.json())
        .then((data) => {
          document.title = data.name;
        });
    };
    rws.onmessage = (message) => {
      console.log(message.data);
      const logObject = JSON.parse(message.data); // get the JSON object from the websocket message data payload
      // example object: {logfile: "./logfile2.log", text: "log message body"}
      const logFileName = logObject.logfile;
      const newLogLines = logObject.text;

      // upsert the new log lines into the ES6 Map for the logFileName
      setLogFiles(
        new Map(
          logFiles.set(logFileName, [
            ...(logFiles.get(logFileName) ?? []),
            newLogLines,
          ])
        )
      );
    };
  }

  return <MainLayout logFiles={logFiles} />;
};

export default App;
