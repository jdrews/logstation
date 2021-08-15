import React from 'react';
import './LogViewer.css';
import { List, AutoSizer } from 'react-virtualized';
import "react-virtualized/styles.css";
import { w3cwebsocket as W3CWebSocket } from "websocket";

const url = 'ws://localhost:8081/ws';
const client = new W3CWebSocket(url);
const minRowHeight = 23;

export default class LogViewer extends React.Component {
    constructor (props) {
        super(props)
        this.listRef = React.createRef();

        this.state = {
            list: [],
            scrollToIndex: 0,
            atBottom: false,
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

    handleScroll = (e) => {
        const bottom = e.scrollHeight - e.scrollTop === e.clientHeight;
        const nearBottom = e.scrollHeight - e.scrollTop - minRowHeight <= e.clientHeight ?? bottom;

        if (bottom || nearBottom) {
            this.setState({ atBottom: true })
            console.log("bottom!")
            const list = [ ...this.state.list ];
            const scrollToIndex = list.length;
            this.setState({
                scrollToIndex: scrollToIndex
            });
            if (this.listRef.current) {
                this.listRef.current.scrollToRow(scrollToIndex)
            }
        } else {
            this.setState({ atBottom: false})
            console.log("not bottom...")
        }
    }

    _updateFeed (message) {
        const list = [ ...this.state.list ];

        list.push(message.data);

        const scrollToIndex = list.length;

        this.setState({
            list: list,
            scrollToIndex: scrollToIndex
        });
        if (this.state.atBottom) {
            this.listRef.current.scrollToRow(scrollToIndex)
        }
    }

    rowRenderer = ({ index, isScrolling, key, style }) => (
        <div
            className="Row"
            key={key}
            style={{
                ...style,
                whiteSpace: "pre-wrap",
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
            <div className="LogViewer" >
                <AutoSizer disableWidth >
                    {({width, height}) => (
                        <List
                            ref={this.listRef}
                            onScroll={this.handleScroll}
                            height={height}
                            rowCount={this.state.list.length}
                            rowHeight={minRowHeight}
                            // autoHeight={true}
                            scrollToIndex={this.state.scrollToIndex}
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