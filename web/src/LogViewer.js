import React from 'react';
import './LogViewer.css';
import { List, AutoSizer } from 'react-virtualized';
import "react-virtualized/styles.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";

const url = 'ws://localhost:8081/ws';
const client = new W3CWebSocket(url);

export default class LogViewer extends React.Component {
    constructor (props) {
        super(props)

        this.state = {
            list: [],
            scrollToRow: 0
        }
    }

    componentDidMount() {
        client.onopen = () => {
            console.log('WebSocket Client Connected');
        };
        client.onmessage = (message) => {
            console.log(message);
            this._updateFeed(message);
        };
    }

    _updateFeed (message) {
        const list = [ ...this.state.list ];

        list.push(message.data);

        const scrollToRow = list.length;

        this.setState({
            list: list,
            scrollToRow: scrollToRow
        });
    }

    rowRenderer = ({ index, isScrolling, key, style }) => (
        <div
            className="Row"
            key={key}
            style={{
                ...style,
                whiteSpace: "pre",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%"
            }}
        >
            {this.state.list[index]}
        </div>
    );

    render() {
        return (
            <div className="LogViewer">
                <AutoSizer disableWidth>
                    {({width, height}) => (
                        <List
                            height={height}
                            rowCount={this.state.list.length}
                            rowHeight={23}
                            scrollToRow={this.state.scrollToRow}
                            rowRenderer={this.rowRenderer}
                            width={1}
                            containerStyle={{
                                width: "100%",
                                maxWidth: "100%"
                            }}
                            style={{
                                width: "100%"
                            }}
                        />
                    )}
                </AutoSizer>
            </div>
        );
    }
}