# LogStation #

Tails a set of log files and serves them up on a web server with syntax colors via regex. 

Binaries avaiable in [releases](https://github.com/jdrews/logstation/releases). See [usage](https://github.com/jdrews/logstation#usage) below.

Focus on:
- Support for both Windows and Linux
- Support as many browsers as possible
- Support for Java 1.6+
- Ease deployment and usage by generating fat jars with minimal configuration required

![image](https://cloud.githubusercontent.com/assets/172766/15636224/de3df408-25c5-11e6-9800-850a46d6de41.jpg)

Developed with Scala, Akka, Lift, Comet (Ajax Push), and JavaScript. 

### Usage ###
* Call `java -jar logstation.jar` 
* It will create an logstation.conf in your current directory and exit
* Update logstation.conf 
* Call `java -jar logstation.jar` again to start it
* Navigate to `127.0.0.1:8080` to start tailing

Can also use `-c your-logstation.conf` argument

#### logstation.conf example ####

```
logstation {
    # Windows example of setting up logs
    logs=["C:\\git\\logstation\\test\\logfile.log","C:\\git\\logstation\\test\\logfile2.log"]
    # Unix example of setting up logs
    # logs=["/home/jdrews/git/logstation/logfile.log","/home/jdrews/git/logstation/logfile2.log"]

    # Setup your syntax below
    # <some-name>=[<RGB_HEX>,<regex-for-line-matching>]
    # matching gives priority to the top most
    syntax {
        # red
        error=["#FF1F1F",".*ERROR.*"]
        # yellow
        warn=["#F2FF00",".*WARN.*"]
        # green
        info=["#00FF2F",".*INFO.*"]
        # blue
        debug=["#4F9BFF",".*DEBUG.*"]
        # cyan
        trace=["#4FFFF6",".*TRACE.*"]
    }

    # Web Server Port
    #    The port used to connect to the LogStation
    webServerPort=8884

    # Number of lines to display per log file
    #    any logs over this will truncate the oldest lines from the page
    maxLogLinesPerLog=500

    # Number of messages to buffer on server
    #    These will be sent to any new connections so they have some history of logs
    #    bufferLength is multiplied by number of logs, and buffered on best effort for each log
    bufferLength=10
}
```

### Building ###

Uses [sbt-assembly](https://github.com/sbt/sbt-assembly) for fat jars. Build via 
`sbt assembly`
