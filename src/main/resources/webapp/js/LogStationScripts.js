function getDocHeight() {
    var D = document;
    return Math.max(
        D.body.scrollHeight, D.documentElement.scrollHeight,
        D.body.offsetHeight, D.documentElement.offsetHeight,
        D.body.clientHeight, D.documentElement.clientHeight
    );
}

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
    adjustScroll()
}

function adjustScroll() {
    if (window.scrollFollow == "follow") {
        window.scrollTo(0,document.body.scrollHeight);
    }
}

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

$( "#follow-indicator" ).click(function() {
    setScrollFollow("userlockout")
});

