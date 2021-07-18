import React, { Component } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";

const client = new W3CWebSocket('ws://127.0.0.1:8001');

class App extends Component {
    componentWillMount() {
        client.onopen = () => {
            console.log('WebSocket Client Connected');
        };
        client.onmessage = (message) => {
            console.log(message);
        };
    }

    render() {
        return (
            <div>
                Practical Intro To WebSockets.
            </div>
        );
    }
}

export default App;