function makeNavBarEntryActive(logId) {
    console.log("making this file the active one: " + logId)
    // takes in stripSpecials(logFile)

    //make all others not active
    $('.link-logfile').not('#link-'+logId).removeClass("active")
    //make the active one active
    $('#link-'+logId).addClass("active")
}

function showLogFile(logFile) {
    console.log("making this file shown: " + logFile)
    var logId = stripSpecials(logFile)
    $('.logFile').not('#' + logId).hide();
    $("#"+logId).show()
    makeNavBarEntryActive(logId)
}

function addNavBarEntry(logFile) {
    console.log("adding nav for " + logFile)
    var logId = stripSpecials(logFile)
    //<li class="active"><a href="javascript:showLogFile('C--git-logstation-test-logfile-log')">Home</a></li>
    $("ul.nav").append('<li class=link-logfile id=link-'+logId+'><a href="javascript:showLogFile(\''+logId+'\')">'+logFile+'</a></li>')
    showLogFile(logFile)
}

function stripSpecials( myid ) {
    return myid.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'-')
}

function addOrAppendLogMessage(logFile, logMessage) {
    var logDiv = $("#"+stripSpecials(logFile))
    if (logDiv.length > 0) {
        console.log("appending to " + logFile + " the message " + logMessage)
        logDiv.append(logMessage + "<br/>")
    } else {
        console.log("adding new logFile " + logFile)
        $("#logbody").append("<div id="+stripSpecials(logFile)+" class=logFile title="+logFile+">"+logMessage+"<br/></div>")
        addNavBarEntry(logFile)
    }
}

