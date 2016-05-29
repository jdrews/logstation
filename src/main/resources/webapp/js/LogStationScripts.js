/*!
 * logstation JavaScript helper functions
 * Copyright 2015 Jon Drews
 * Distributed under an Apache 2.0 License
 */

// Safe way to get document height
function getDocHeight() {
    var D = document;
    return Math.max(
        D.body.scrollHeight, D.documentElement.scrollHeight,
        D.body.offsetHeight, D.documentElement.offsetHeight,
        D.body.clientHeight, D.documentElement.clientHeight
    );
}

// make a navigation bar entry the active one based on logId
function makeNavBarEntryActive(logId) {
    console.log("making this file the active one: " + logId)
    // takes in stripSpecials(logFile)

    //make all others not active
    $('.link-logfile').not('#link-'+logId).removeClass("active")
    //make the active one active
    $('#link-'+logId).addClass("active")
}

// increment number of logs monitoring
function incrementNumberOfLogs() {
    if (typeof window.numberOfLogs == 'undefined') {
        window.numberOfLogs = 1
    } else {
        window.numberOfLogs = window.numberOfLogs + 1
    }
}

// hide all other log files, and make logFile the active one
function showLogFile(logFile) {
    console.log("making this file shown: " + logFile)
    var logId = stripSpecials(logFile)
    $('.logFile').not('#' + logId).hide();
    $("#"+logId).show()
    makeNavBarEntryActive(logId)
}

// add a new navigation bar entry for logFile
function addNavBarEntry(logFile) {
    console.log("checking nav for " + logFile)
    var logId = stripSpecials(logFile)
    // only add it if it doesn't already exist
    if ($("#link-"+logId).length == 0) {
        console.log("adding nav for " + logFile)
        //<li class="active"><a href="javascript:showLogFile('C--git-logstation-test-logfile-log')">Home</a></li>
        $("ul.nav").append('<li class=link-logfile id=link-'+logId+'><a href="javascript:showLogFile(\''+logId+'\')">'+logFile+'</a></li>')
        showLogFile(logFile)
        incrementNumberOfLogs()
    }

}

// creates an id based on the log file path, that doesn't contain any special characters
function stripSpecials( myid ) {
    return myid.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'-')
}

//if the logFile doesn't exist, add it
function addOrAppendLogMessage(logFile, logMessage) {
    //create logId
    var logId = stripSpecials(logFile)
    // Get the div corresponding to this log file
    var logDiv = $("#"+logId)
    if (logDiv.length) {
        // log file already exists, append message
        console.log("appending to " + logFile + " the message " + logMessage)
        logDiv.append("<div class=logMessage>" + logMessage + "<br/></div>")
    } else {
        // log file doesn't exist yet. add it with this message
        console.log("adding new logFile " + logFile)
        $("#logbody").append("<div id="+logId+" class=logFile title="+logFile+"><div class=logMessage>"+logMessage+"<br/></div></div>")
        addNavBarEntry(logFile)
    }
    incrementTotalLogLines(logId)
    adjustScroll()
}

// update the current maxLogLinesPerLog
function updateMaxLogLinesPerLog(maxLogLinesPerLog) {
    console.log("updating maxLogLinesPerLog to " + maxLogLinesPerLog)
    window.maxLogLinesPerLog = maxLogLinesPerLog
}

// increment number of lines in all logs, and handle truncating if they get too large
function incrementTotalLogLines(logId) {

    // increment number of total lines
    if (typeof window.totalLogLines == 'undefined') {
        // first time incrementing any logs. make the Object
        window.totalLogLines = {};
        window.totalLogLines[logId] = 1
    } else if (!(logId in window.totalLogLines)) {
        // first time incrementing this log. initialize
        window.totalLogLines[logId] = 1
    } else {
        // we've managed this log before. increment
        window.totalLogLines[logId] = window.totalLogLines[logId] + 1
    }

    if (typeof window.maxLogLinesPerLog == 'undefined') {
        window.maxLogLinesPerLog = 140
    }

    console.log(logId + " => log line calculations: " + window.totalLogLines[logId] + " / " + (window.maxLogLinesPerLog))
    // if we've gone over maxLogLinesPerLog, truncate!
    if ( window.totalLogLines[logId] > window.maxLogLinesPerLog) {
        console.log( "working on truncating lines for " + logId);
        $( "#"+logId ).children(".logMessage").first().remove()
        //window.totalLogLines = window.totalLogLines + truncatedLines.length
        //$( this ).removeChild(truncatedLine)
    }
}

// if we're following, then scroll to bottom
function adjustScroll() {
    if (window.scrollFollow == "follow") {
        window.scrollTo(0,document.body.scrollHeight);
    }
}

// helper function to control the current scroll follow state
function setScrollFollow(desiredScrollFollow) {
    if (typeof window.scrollFollow == 'undefined') {
        // turn it on by default
        window.scrollFollow = "follow"
        $("#follow-indicator").html("follow on")
    } else if (window.scrollFollow == "userlockout" & desiredScrollFollow == "userlockout") {
        // user wants to turn user lockout off
        window.scrollFollow = "follow"
        $("#follow-indicator").html("follow on")
    } else if (desiredScrollFollow == "userlockout") {
        // user wants to turn user lockout on
        window.scrollFollow = "userlockout"
        $("#follow-indicator").html("follow user disabled")
    } else if (window.scrollFollow != "userlockout") {
        // we're not in a user lockout state
        if (desiredScrollFollow == "follow") {
            // user scrolled to bottom, start following again
            window.scrollFollow = desiredScrollFollow
            $("#follow-indicator").html("follow on")
        } else if (desiredScrollFollow == "nofollow") {
            // user scrolled up, stop following.
            window.scrollFollow = desiredScrollFollow
            $("#follow-indicator").html("follow off")
        }
    }

    console.log("scrollFollow: " + window.scrollFollow)
}

// If we hit the bottom-- turn on follow scroll. unless the user locked it out
$(window).scroll(function() {
    if($(window).scrollTop() + $(window).height() == getDocHeight()) {
        setScrollFollow("follow")
    } else {
        if (window.scrollFollow == "follow") {
            setScrollFollow("nofollow")
        }
    }
});

// if user clicks follow-indicator, start the scroll follow user lockout
$( "#follow-indicator" ).click(function() {
    setScrollFollow("userlockout")
});

