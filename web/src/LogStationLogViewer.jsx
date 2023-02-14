import React from 'react';
import {LogViewer, LogViewerSearch} from '@patternfly/react-log-viewer';
import {Button, Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core';
import "@patternfly/react-core/dist/styles/base.css";
import OutlinedPlayCircleIcon from "@patternfly/react-icons/dist/esm/icons/outlined-play-circle-icon";

const LogStationLogViewer = (props) => {

    // isPaused: control for whether a user has scrolled up (paused)
    // this isPaused effectively stops the webapp from pinning to the bottom of the log
    const [isPaused, setIsPaused] = React.useState(false);

    // selectedScrollToRow: the row in the log that the LogViewer should scroll to (via prop scrollToRow)
    // when set to undefined, the scrollToRow prop will do nothing
    const [selectedScrollToRow, setSelectedScrollToRow] = React.useState(undefined)

    // reference for the LogViewer component
    const logViewerRef = React.useRef();

    React.useEffect(() => {
        if (!isPaused) {
            if (logViewerRef && logViewerRef.current) {
                setSelectedScrollToRow(props.data.length) // scroll down to the end of the log file
            }
        }
    }, [isPaused, props.data.length]);

    const onScroll = ({ scrollOffsetToBottom, _scrollDirection, scrollUpdateWasRequested }) => {
        if (!scrollUpdateWasRequested) {
            if (scrollOffsetToBottom > 0) { // if we're not at the bottom
                setIsPaused(true); // pause log
                setSelectedScrollToRow(undefined) // stop the pinning/tailing to the bottom via prop scrollToRow
            } else {
                setIsPaused(false); // tail the log (pin to the bottom of log)
            }
        }
    };

    // shows a button on the bottom that lets you resume tailing the log if you scrolled up / paused
    const FooterButton = () => {
        const handleClick = _e => {
            setIsPaused(false);
        };
        return (
            <Button onClick={handleClick} isBlock>
                <OutlinedPlayCircleIcon />
                resume
                {/*resume {linesBehind === 0 ? null : `and show ${linesBehind} lines`}*/}
            </Button>
        );
    };

    return (
        <LogViewer hasLineNumbers={false}
                   height={'100%'}
                   width={'100%'}
                   data={props.data}
                   theme={'dark'}
                   isTextWrapped={true}
                   innerRef={logViewerRef}
                   scrollToRow={selectedScrollToRow}
                   onScroll={onScroll}
                   footer={isPaused && <FooterButton />}
                   //TODO: disabled search for now. Will come back to it.
                   // toolbar={
                   //     <Toolbar>
                   //         <ToolbarContent>
                   //             <ToolbarItem>
                   //                 <LogViewerSearch minSearchChars={2} placeholder={"         search"}/>
                   //             </ToolbarItem>
                   //         </ToolbarContent>
                   //     </Toolbar>
                   // }
        />
    );
};

export default LogStationLogViewer;