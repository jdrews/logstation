import React from 'react';
import './LogViewer.css';
import {
    List,
    AutoSizer,
    CellMeasurer,
    CellMeasurerCache
} from 'react-virtualized';
import "react-virtualized/styles.css";
import ReconnectingWebSocket from 'reconnecting-websocket';

const url = 'ws://' + window.location.host + '/ws';
const rws = new ReconnectingWebSocket(url);

const minRowHeight = 23;

export default class LogViewer extends React.Component {
    constructor (props) {
        super(props);
        this._listRef = React.createRef();

        this.state = {
            lines: [],
            scrollToIndex: 0,
            atBottom: false,
        }

        this._cache = new CellMeasurerCache({
            fixedWidth: true,
            defaultHeight: 23,
            // keyMapper: rowIndex => this.state.lines[rowIndex].id
        });

    }

    handleScroll = (e) => {
        // const bottom = e.scrollHeight - e.scrollTop === e.clientHeight;
        const nearBottom = e.scrollHeight - e.scrollTop - minRowHeight <= e.clientHeight;

        if (nearBottom) {
            this.setState({ atBottom: true })
            console.log("bottom!")
            const lines = [ ...this.state.lines ];
            const scrollToIndex = lines.length;
            this.setState({
                scrollToIndex: scrollToIndex
            });
            if (this._listRef.current) {
                this._listRef.current.scrollToRow(scrollToIndex)
            }
        } else {
            this.setState({ atBottom: false})
            console.log("not bottom...")
        }
    }

     _updateFeed (message) {
        const lines = [ ...this.state.lines ];

        lines.push(message.data);

        const scrollToIndex = lines.length;

        this.setState({
            lines: lines,
            scrollToIndex: scrollToIndex
        });

        if (this._listRef.current) {
            if (this.state.atBottom) {
                this._listRef.current.scrollToRow(scrollToIndex)
            }
             this._cache.clearAll();
             this._listRef.current.recomputeRowHeights(scrollToIndex);
        }

    }

    rowRenderer = ({ index, isScrolling, key, style, ...rest }) => (
        <CellMeasurer {...rest} rowIndex={index} columnIndex={0} cache={this._cache} key={key}>
            {({registerChild}) => (
                <div
                ref={registerChild}
                className="Row"
                key={key}
                style={{
                    ...style,
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    minHeight: this.state.lines[index].height
                }}
            >
                {this.state.lines[index]}
            </div> )}
        </CellMeasurer>

    );

    render() {
        return (
            <div className="LogViewer" >
                <AutoSizer disableWidth >
                    {({height}) => (
                        <List
                            ref={this._listRef}
                            onScroll={this.handleScroll}
                            height={height}
                            rowCount={this.state.lines.length}
                            deferredMeasurementCache={this._cache}
                            rowHeight={this._cache.rowHeight}
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

    connect() {
        rws.onopen = () => {
            console.log('WebSocket Connected');
        };
        rws.onmessage = (message) => {
            console.log(message);
            this._updateFeed(message);
        };
    }

    componentDidMount() {
        this.connect();
    }
}