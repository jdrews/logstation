package com.jdrews.logstation.config

/**
 * Created by jdrews on 4/12/2015.
 */
object DefaultConfigHolder {
    val defaultConfig =
        """logstation {
          |    # Windows example of setting up logs
          |    logs=["C:\\git\\logstation\\test\\logfile.log","C:\\git\\logstation\\test\\logfile2.log"]
          |    # Unix example of setting up logs
          |    # logs=["/home/jdrews/git/logstation/logfile.log","/home/jdrews/git/logstation/logfile2.log"]
          |
          |    # Setup your syntax below
          |    # <some-name>=[<RGB_HEX>,<regex-for-line-matching>]
          |    # matching gives priority to the top most
          |    syntax {
          |        # red
          |        error=["#FF1F1F",".*ERROR.*"]
          |        # yellow
          |        warn=["#F2FF00",".*WARN.*"]
          |        # green
          |        info=["#00FF2F",".*INFO.*"]
          |        # blue
          |        debug=["#4F9BFF",".*DEBUG.*"]
          |        # cyan
          |        trace=["#4FFFF6",".*TRACE.*"]
          |    }
          |
          |    # Web Server Port
          |    #    The port used to connect to the LogStation
          |    webServerPort=8884
          |
          |    # Number of lines to display per log file
          |    #    any logs over this will truncate the oldest lines from the page
          |    maxLogLinesPerLog=500
          |
          |    # Number of messages to buffer on server
          |    #    These will be sent to any new connections so they have some history of logs
          |    #    bufferLength is multiplied by number of logs, and buffered on best effort for each log
          |    bufferLength=10
          |}
        """.stripMargin
}
