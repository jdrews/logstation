import "./LogViewer.css";
import LogStationLogViewer from "./LogStationLogViewer";

import Container from "@mui/material/Container";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";

function a11yProps(index) {
  return {
    id: `log-selector-${index}`,
    "aria-controls": `log-selector-panel-${index}`,
  };
}

const MainLayout = (props) => {
  const [selectedLogFile, setSelectedLogFile] = useState("0");

  const handleLogSelection = (event, newLogFile) => {
    setSelectedLogFile(newLogFile);
  };

  return (
    <Container
      disableGutters
      maxWidth="false"
      sx={{ width: "100%", height: "100vh" }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          background: "#090909",
          height: "8vh",
          m: 0,
          p: 0,
        }}
      >
        <Tabs
          value={selectedLogFile}
          aria-label="log selector bar"
          textColor="secondary"
          indicatorColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
          onChange={handleLogSelection}
        >
          <Tab
            key="0"
            value="0"
            label="logstation"
            disabled={true}
            disableRipple={true}
            {...a11yProps("0")}
            sx={{
              color: "#ffffff !important",
              opacity: "0.6 !important",
              textTransform: "unset",
              fontSize: "110%",
            }}
          />
          {[...props.logFiles.keys()].map((logFile) => (
            <Tab
              key={logFile}
              value={logFile}
              label={
                <Tooltip title={logFile}>
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "9rem",
                      direction: "rtl",
                      textAlign: "left",
                    }}
                  >
                    <Typography noWrap align={"left"} fontSize="0.8rem">
                      {logFile}
                    </Typography>
                  </div>
                </Tooltip>
              }
              wrapped={false}
              {...a11yProps(logFile)}
              sx={{
                color: "#ffffff",
                textTransform: "unset",
              }}
            />
          ))}
        </Tabs>
      </Box>
      <Box
        sx={{ width: "100%", height: "92vh", background: "#030303" }}
        className="LogViewerBox"
      >
        <LogStationLogViewer
          data={props.logFiles.get(selectedLogFile) ?? []}
          logFileName={selectedLogFile}
        />
      </Box>
    </Container>
  );
};

export default MainLayout;
