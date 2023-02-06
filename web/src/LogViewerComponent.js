import React from 'react';
import { LogViewer } from '@patternfly/react-log-viewer';

const BasicLogViewer = (props) => {

    return (
        <React.Fragment>
            <LogViewer hasLineNumbers={false} height={'100%'} width={'100%'} data={props.data} theme={'dark'} isTextWrapped={true}/>
        </React.Fragment>
    );
};

export default BasicLogViewer;