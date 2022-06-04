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

const url = 'ws://localhost:8081/ws';
const rws = new ReconnectingWebSocket(url);

const minRowHeight = 23;

export default class LogViewer extends React.Component {
    constructor (props) {
        super(props)
        // this.listRef = React.createRef();

        //TODO: Handle different line sizes with CellMeasurer
        //  https://github.com/bvaughn/react-virtualized/blob/master/docs/CellMeasurer.md

        this.state = {
            lines: [],
            scrollToIndex: 0,
            atBottom: false,
        }

        this.cache = new CellMeasurerCache({
            fixedWidth: true,
            defaultHeight: 23,
            keyMapper: rowIndex => this.state.lines[rowIndex].id
        });

        // this.connect = this.connect.bind(this);


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
            if (this.listRef) {
                this.listRef.scrollToRow(scrollToIndex)
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
        if (this.state.atBottom) {
            this.listRef.scrollToRow(scrollToIndex)
        }
        //TODO: figure this out
        // this.listRef.recomputeRowHeights(scrollToIndex);

    }

    rowRenderer = ({ index, isScrolling, key, style, ...rest }) => (
        <CellMeasurer {...rest} rowIndex={index} columnIndex={0} cache={this.cache} key={key}>
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

    // setListRef = r => (this.listRef = r);

    render() {
        return (
            <div className="LogViewer" >
                <AutoSizer disableWidth >
                    {({height}) => (
                        <List
                            // ref={this.setListRef}
                            ref={ref => {this.listRef = ref}}
                            onScroll={this.handleScroll}
                            height={height}
                            rowCount={this.state.lines.length}
                            deferredMeasurementCache={this.cache}
                            rowHeight={this.cache.rowHeight}
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