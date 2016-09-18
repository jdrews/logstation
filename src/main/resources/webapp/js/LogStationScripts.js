/*!
 * logstation JavaScript helper functions
 * Copyright 2015 Jon Drews
 * Distributed under an Apache 2.0 License
 */

window.regexState = "off";

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
    console.log("making this file the active one: " + logId);
    // takes in stripSpecials(logFile)

    //make all others not active
    $('.link-logfile').not('#link-'+logId).removeClass("active");
    //make the active one active
    $('#link-'+logId).addClass("active")
}

// hide all other log files, and make logFile the active one
function showLogFile(logFile) {
    console.log("making this file shown: " + logFile);
    var logId = stripSpecials(logFile);
    $('.logFile').not('#' + logId).hide();
    $("#"+logId).show();
    makeNavBarEntryActive(logId)
    setScrollFollow("follow")
    adjustScroll()
}

// add a new navigation bar entry for logFile
function addNavBarEntry(logFile) {
    console.log("checking nav for " + logFile);
    var logId = stripSpecials(logFile);
    // only add it if it doesn't already exist
    if ($("#link-"+logId).length == 0) {
        console.log("adding nav for " + logFile);
        //<li class="active"><a href="javascript:showLogFile('C--git-logstation-test-logfile-log')">Home</a></li>
        var truncatedFileNameArr = logFile.split(/[\\/]+/);
        var truncatedFileName = truncatedFileNameArr[truncatedFileNameArr.length - 1];
        $("ul.nav").append('<li class=link-logfile id=link-'+logId+' title=\''+logFile+'\'><a href="javascript:showLogFile(\''+logId+'\')">'+truncatedFileName+'</a></li>');
        // check to see if this is the first nav entry
        var numNavEntries = $('.link-logfile').length
        if (numNavEntries == 1) {
            showLogFile(logFile)
        }
    }

}

// creates an id based on the log file path, that doesn't contain any special characters
function stripSpecials( myid ) {
    return myid.replace(/([~!@#$%^&*()_+=`{}\[\]\|\\:;'<>,.\/? ])+/g, '-').replace(/^(-)+|(-)+$/g,'')
}

// if the logFile doesn't exist, add it
// used to push in logs from LogStationPage via a JsFunc
function addOrAppendLogMessage(logFile, logMessage) {
    if (window.pauseState == "play") {
        if (window.regexState == "on") {
            regex = $("#regex-field").val()
            if (regex) {
                if (logMessage.match(regex)) {
                    // regex match, display it
                    displayIt = true
                } else {
                    // regex fail, discard
                    displayIt = false
                }
            } else {
                // regex is empty, default to display it
                displayIt = true
            }
        } else {
            // regex is off, display it
            displayIt = true
        }
        if (displayIt) {
            //create logId
            var logId = stripSpecials(logFile);
            incrementTotalLogLines(logId);
            // Get the div corresponding to this log file
            var logDiv = $("#"+logId);
            console.log("working on " + logId + "; logDiv.length = " + logDiv.length);
            if (logDiv.length) {
                // log file already exists, append message
                console.log("appending to " + logId + " the message " + logMessage);
                logDiv.append("<div class=logMessage>" + logMessage + "<br/></div>")
            } else {
                // log file doesn't exist yet. add it with this message
                console.log("adding new logFile " + logId);
                $("#logbody").append("<div id="+logId+" class=logFile style=\'display: none;\' title=\'"+logFile+"\'><div class=logMessage>"+logMessage+"<br/></div></div>");
                addNavBarEntry(logFile)
            }
            truncateLinesIfNeeded(logId);
            adjustScroll()
        }
    } else {
        console.log("state paused, not appending message")
    }
}

// update the current maxLogLinesPerLog
// called from LogStationPage
function updateMaxLogLinesPerLog(maxLogLinesPerLog) {
    console.log("updating maxLogLinesPerLog to " + maxLogLinesPerLog);
    window.maxLogLinesPerLog = maxLogLinesPerLog
}

// called from LogStationPage for resetting all local vars
function resetAll() {
    console.log("resetting all");
    window.totalLogLines  = {};
    window.scrollFollow = "follow"
}

// called from LogStationPage to default to following (tailing) to logs
function enableScrollFollow() {
    window.scrollFollow = "follow"
}

// called from LogStationPage to default to playing log messages
function enablePlay() {
    window.pauseState = "play"
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
}

function logExists(logId) {
    return (logId in window.totalLogLines)
}

// chop some log messages off the head if we've hit maxLogLinesPerLog
function truncateLinesIfNeeded(logId) {
    console.log(logId + " => log line calculations: " + window.totalLogLines[logId] + " / " + (window.maxLogLinesPerLog));
    // if we've gone over maxLogLinesPerLog, truncate!
    if ( window.totalLogLines[logId] > window.maxLogLinesPerLog) {
        console.log( "working on truncating lines for " + logId);
        $( "#"+logId ).children(".logMessage").first().remove();
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
        window.scrollFollow = "follow";
        $("#follow-indicator").html("follow on")
    } else if (window.scrollFollow == "userlockout" && desiredScrollFollow == "userlockout") {
        // user wants to turn user lockout off
        window.scrollFollow = "follow";
        $("#follow-indicator").html("follow on")
    } else if (desiredScrollFollow == "userlockout") {
        // user wants to turn user lockout on
        window.scrollFollow = "userlockout";
        $("#follow-indicator").html("follow user disabled")
    } else if (window.scrollFollow != "userlockout") {
        // we're not in a user lockout state
        if (desiredScrollFollow == "follow") {
            // user scrolled to bottom, start following again
            window.scrollFollow = desiredScrollFollow;
            $("#follow-indicator").html("follow on")
        } else if (desiredScrollFollow == "nofollow") {
            // user scrolled up, stop following.
            window.scrollFollow = desiredScrollFollow;
            $("#follow-indicator").html("follow off")
        }
    }

    console.log("scrollFollow: " + window.scrollFollow)
}

// Logic to control the state of the pause button
function updatePause () {
    if ($("#pause-button").text().match(/play/)) { // if we're playing right now
        console.log("pausing");
        $("#pause-button").html("paused");
        window.pauseState = "pause"
    } else if ($("#pause-button").text().match(/pause/)) { // if we're paused right now
        console.log("playing");
        $("#pause-button").html("playing");
        window.pauseState = "play"
    }
}

// Logic to control the state of the regex button
function updateRegex () {
    if ($("#regex-button").text().match(/regex on/)) { // if we're playing right now
        console.log("disabling regex");
        $("#regex-button").html("regex off");
        window.regexState = "off"
    } else if ($("#regex-button").text().match(/regex off/)) { // if we're paused right now
        console.log("enabling regex");
        $("#regex-button").html("regex on");
        window.regexState = "on"
    }
}

// If we hit the bottom-- turn on follow scroll. unless the user locked it out
$(window).scroll(function() {
    // If we're within 30px (one line) of the bottom we scroll follow
    if($(window).scrollTop() + $(window).height() > (getDocHeight() - 30) ) {
        if (window.scrollFollow == "nofollow") {
            setScrollFollow("follow")
        }
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

// TODO: Make pause stop the backend from sending any new log messages
// if user clicks pause-button, update scrolling
$( "#pause-button" ).click(function() {
    updatePause()
});

$( "#regex-button" ).click(function() {
    updateRegex()
});
