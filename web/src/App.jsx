//const wsurl = 'ws://' + window.location.host + '/ws'; //PROD //TODO: Set this to PROD before ship
//const url = window.location.protocol + "//" + window.location.host //PROD
import ReconnectingWebSocket from "reconnecting-websocket";
import MainLayout from "./MainLayout";
import {useEffect, useState} from "react";

const wsurl = 'ws://localhost:8884/ws' //DEV
const url = 'http://localhost:8884' //DEV

const rws = new ReconnectingWebSocket(wsurl);

const App = (props) => {
    const [lines, setLines] = useState([]);
    const [title, setTitle] = useState("logstation");
    useEffect(() => {
        connect()

    });

    function connect() {
        rws.onopen = () => {
            console.log('WebSocket Connected');
            fetch(url + "/settings/logstation-name")
                .then(response => response.json())
                .then(data => {
                    setTitle(data.name)
                    document.title = title
                });
        };
        rws.onmessage = (message) => {
            console.log(message.data);
            setLines([...lines, JSON.parse(message.data).text])
        };
    }

    return <MainLayout name={title} lines={lines}/>
}


export default App;