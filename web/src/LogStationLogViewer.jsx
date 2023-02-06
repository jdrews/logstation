import React from 'react';
import {LogViewer, LogViewerSearch} from '@patternfly/react-log-viewer';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import "@patternfly/react-core/dist/styles/base.css";

const LogStationLogViewer = (props) => {

    return (
        <LogViewer hasLineNumbers={false}
                   height={'100%'}
                   width={'100%'}
                   data={props.data}
                   theme={'dark'}
                   isTextWrapped={true}
                   toolbar={
                       <Toolbar>
                           <ToolbarContent>
                               <ToolbarItem>
                                   <LogViewerSearch minSearchChars={2} placeholder={"         search"}/>
                               </ToolbarItem>
                           </ToolbarContent>
                       </Toolbar>
                   }/>
    );
};

export default LogStationLogViewer;