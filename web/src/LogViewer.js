/** @jsxImportSource @emotion/react */

import React from 'react';
import './LogViewer.css';
import {
    List,
    AutoSizer,
    CellMeasurer,
    CellMeasurerCache
} from 'react-virtualized';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { css } from '@emotion/react'
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

//const wsurl = 'ws://' + window.location.host + '/ws'; //PROD //TODO: Set this to PROD before ship
//const url = window.location.protocol + "//" + window.location.host //PROD
const wsurl = 'ws://localhost:8884/ws' //DEV
const url = 'http://localhost:8884' //DEV

const rws = new ReconnectingWebSocket(wsurl);

const minRowHeight = 23;

export default class LogViewer extends React.Component {
    constructor (props) {
        super(props);
        this._listRef = React.createRef();

        this.state = {
            lines: [],
            scrollToIndex: 0,
            atBottom: false,
            title: "logstation",
            syntaxColors: [],
            theme: undefined
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

     _updateFeed (logMessage) {
        const lines = [ ...this.state.lines ];

        lines.push(logMessage);

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
        <CellMeasurer {...rest} rowIndex={index} columnIndex={0} cache={this._cache} key={key} >
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
                    minHeight: this.state.lines[index].height,
                    color: JSON.parse(this.state.lines[index]).color
                }}
            >
                {JSON.parse(this.state.lines[index]).text}
            </div> )}
        </CellMeasurer>

    );

    noRowsRenderer() {
        return <div css={css`
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            `}
        >logstation notice: No lines detected in watched files</div>;
    }

    a11yProps(index) {
        return {
            id: `log-selector-${index}`,
            'aria-controls': `log-selector-panel-${index}`,
        };
    }

    //TODO: Figure out how to wrap this in a tabular header that shows the file and lets you swap between files
        // Might be able to have this react class be instantiated within a larger react class that handles the file tabs and switching
    render() {
        return (
            <Container disableGutters maxWidth="false" sx={{width: '100%', height: '100vh'}}>
                <ThemeProvider theme={this.theme}>
                    <SetTheme setTheme={this.setTheme}/>
                    <Box sx={{borderBottom: 1, borderColor: 'divider', height: '8vh', m: 0, p: 0}}>
                        <Tabs aria-label="log selector bar" textColor="secondary" indicatorColor="secondary">
                            {/*<Tabs value={value} onChange={handleChange} aria-label="basic tabs example">*/
                                /*TODO: use value and onChange to populate tabs dynamically and make them do stuff*/}
                            <Tab label="logstation" disabled={true} disableRipple={true} {...this.a11yProps(0)}
                                 sx={{
                                     color: '#ffffff !important',
                                     opacity: '0.6 !important',
                                     textTransform: 'unset',
                                     fontSize: '110%'
                                 }}/>
                            {/*TODO: This should pull from the MUI theme instead of hardcoded.*/}
                            <Tab label="log1.log" {...this.a11yProps(0)}
                                 sx={{color: '#ffffff', background: '#222', textTransform: 'unset'}}/>
                            <Tab label="log2.log" {...this.a11yProps(1)}
                                 sx={{color: '#ffffff', background: '#222', textTransform: 'unset'}}/>
                        </Tabs>
                    </Box>
                    <Box sx={{width: '100%', height: '92vh', m: 0, p: 0}} className="LogViewer">
                            <AutoSizer disableWidth>
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
                                        noRowsRenderer={this.noRowsRenderer}
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
                    </Box>
                </ThemeProvider>
            </Container>

        );
    }

    connect() {
        rws.onopen = () => {
            console.log('WebSocket Connected');
            fetch(url + "/settings/logstation-name")
                .then(response => response.json())
                .then(data => {
                    this.setState({title: data.name})
                    document.title = this.state.title
                });
            // Commenting this out for now since line coloring is now happening on the server side.
            //      But it would be neat to present the regex and syntax colors to the frontend for administration CRUD purposes...
            // fetch(url + "/settings/syntax")
            //     .then(response => response.json())
            //     .then(data => {
            //
            //         this.state.syntaxColors=JSON.parse(data) //TODO: this shows up as an array of objects, need it to be readable
            //         console.log("syntaxColors: " + this.state.syntaxColors)
            //     })
        };
        rws.onmessage = (message) => {
            console.log(message.data);
            this._updateFeed(message.data);
        };
    }

    componentDidMount() {
        this.connect();
    }

    setTheme = theme => {
        this.setState({theme})
    }
}

const SetTheme = ({ setTheme }) => {
    const theme = useTheme()

    React.useEffect(() => {
        setTheme(theme)
        return () => null
    })

    return null
}