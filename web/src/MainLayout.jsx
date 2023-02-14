import './LogViewer.css';
import LogStationLogViewer from "./LogStationLogViewer";

import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import {useState} from "react";

function a11yProps(index) {
    return {
        id: `log-selector-${index}`,
        'aria-controls': `log-selector-panel-${index}`,
    };
}

const MainLayout = (props) => {
    const [selectedLogFile, setSelectedLogFile] = useState("0");

    const handleLogSelection = (event, newLogFile) => {
        setSelectedLogFile(newLogFile);
    };

    return (
        <Container disableGutters maxWidth="false" sx={{width: '100%', height: '100vh'}}>
                <Box sx={{borderBottom: 1, borderColor: 'divider', height: '8vh', m: 0, p: 0}}>
                    <Tabs value={selectedLogFile} aria-label="log selector bar" textColor="secondary" indicatorColor="secondary" onChange={handleLogSelection}>
                        <Tab key="0" value="0" label="logstation" disabled={true} disableRipple={true} {...a11yProps("0")}
                             sx={{
                                 color: '#ffffff !important',
                                 opacity: '0.6 !important',
                                 textTransform: 'unset',
                                 fontSize: '110%'
                             }}/>
                        {/*TODO: This should pull from the MUI theme instead of hardcoded.*/}
                        {[...props.logFiles.keys()].map(logFile =>
                            (<Tab key={logFile} value={logFile} label={logFile} {...a11yProps(logFile)} sx={{color: '#ffffff', background: '#222', textTransform: 'unset'}}/>)
                        )}
                    </Tabs>
                </Box>
                <Box sx={{width: '100%', height: '92vh'}} className="LogViewerBox">
                       <LogStationLogViewer data={props.logFiles.get(selectedLogFile) ?? []} logFileName={selectedLogFile}/>
                </Box>
        </Container>
    );
}

export default MainLayout;
