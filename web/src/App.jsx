import ReconnectingWebSocket from "reconnecting-websocket";
import MainLayout from "./MainLayout";
import { useEffect, useState } from "react";

const App = () => {
  const url = window.location.protocol + "//" + window.location.host;
  // const url = "http://localhost:8884"; // used in dev mode, ignore otherwise
  const [logFiles, setLogFiles] = useState(new Map());

  useEffect(() => {
    fetch(url + "/settings/websocket-security")
      .then((response) => response.json())
      .then((data) => {
        const webSocketType = data.useSecureWebSocket ? "wss://" : "ws://";
        connect(new ReconnectingWebSocket(webSocketType + window.location.host + "/ws"));
        // connect(new ReconnectingWebSocket(webSocketType + "localhost:8884" + "/ws")); // used in dev mode, ignore otherwise
      });
  }, []);

  function connect(rws) {
    rws.onopen = () => {
      console.log("WebSocket Connected");
      fetch(url + "/settings/logstation-name")
        .then((response) => response.json())
        .then((data) => {
          document.title = data.name;
        });
    };
    rws.onmessage = (message) => {
      const logObject = JSON.parse(message.data); // get the JSON object from the websocket message data payload
      // example object: {logfile: "./logfile2.log", text: "log message body"}
      const logFileName = logObject.logfile;
      const newLogLines = logObject.text;

      // upsert the new log lines into the Map for the logFileName
      setLogFiles((prevLogFiles) => {
        const newMap = new Map(prevLogFiles);
        const existingMessages = newMap.get(logFileName) || [];
        newMap.set(logFileName, [...existingMessages, newLogLines]);
        return newMap;
      });
    };
  }

  const clearLogs = () => {
    setLogFiles((prevLogFiles) => {
      const newMap = new Map();
      // Keep the files in the list, just clear their content
      for (const key of prevLogFiles.keys()) {
        newMap.set(key, []);
      }
      return newMap;
    });
  };

  return <MainLayout logFiles={logFiles} onClearLogs={clearLogs} />;
};

export default App;
