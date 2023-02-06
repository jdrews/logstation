import './LogViewer.css';
import LogViewerComponent from "./LogViewerComponent";

import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

function a11yProps(index) {
    return {
        id: `log-selector-${index}`,
        'aria-controls': `log-selector-panel-${index}`,
    };
}

const MainLayout = (props) => {
    //TODO: Figure out how to wrap this in a tabular header that shows the file and lets you swap between files
        // Might be able to have this react class be instantiated within a larger react class that handles the file tabs and switching
    return (
        <Container disableGutters maxWidth="false" sx={{width: '100%', height: '100vh'}}>
                <Box sx={{borderBottom: 1, borderColor: 'divider', height: '8vh', m: 0, p: 0}}>
                    <Tabs value={1} aria-label="log selector bar" textColor="secondary" indicatorColor="secondary">
                        {/*<Tabs value={value} onChange={handleChange} aria-label="basic tabs example">*/
                            /*TODO: use value and onChange to populate tabs dynamically and make them do stuff*/}
                        <Tab label="logstation" disabled={true} disableRipple={true} {...a11yProps(0)}
                             sx={{
                                 color: '#ffffff !important',
                                 opacity: '0.6 !important',
                                 textTransform: 'unset',
                                 fontSize: '110%'
                             }}/>
                        {/*TODO: This should pull from the MUI theme instead of hardcoded.*/}
                        <Tab label="log1.log" {...a11yProps(1)}
                             sx={{color: '#ffffff', background: '#222', textTransform: 'unset'}}/>
                        <Tab label="log2.log" {...a11yProps(2)}
                             sx={{color: '#ffffff', background: '#222', textTransform: 'unset'}}/>
                    </Tabs>
                </Box>
                <Box sx={{width: '100%', height: '92vh', m: 0, p: 0}} className="LogViewer">
                       <LogViewerComponent data={props.lines}/>
                </Box>
        </Container>
    );
}

export default MainLayout;
