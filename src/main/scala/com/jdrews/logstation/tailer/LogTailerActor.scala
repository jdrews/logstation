package com.jdrews.logstation.tailer

import java.io._

import akka.actor.{Actor, ActorLogging, ActorRef}
import com.google.common.xml.XmlEscapers
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.service.ServiceShutdown
import com.jdrews.logstation.webserver.LogMessage
import com.osinka.tailf.Tail

/**
 * Created by jdrews on 2/21/2015.
 *
 * Actor to perform the tailing functionality
 * Should be one of these actors per log
 */
class LogTailerActor extends Actor with ActorLogging {
    // TODO: probably doesn't need to be a set. There should be only one thread per actor
    private var readerThreads = Set.empty[Thread]
    var colorizer: Option[ActorRef] = None
    private val bridge = BridgeController.getBridgeActor
    private val sleepIntervalForUpdates = 2000

    def readLastLines(r: BufferedReader, skipBytes: Long, logFile: String): Unit = {
        if (skipBytes > 0) {
            r.skip(skipBytes)
            // read off any garbage line
            r.readLine()
            // back to normal tailing
        }
        //read(r, logFile)
        loopRead(r, logFile)
    }

    def read(r: BufferedReader, logFile: String): Unit = {
        if (!Thread.currentThread().isInterrupted) {
            val l = r.readLine
            if (l != null) {
//                log.info(s"read line: $l")
                // pass to colorizer if it's up, otherwise skip it and go straight to bridge
                colorizer.getOrElse(bridge) ! new LogMessage(XmlEscapers.xmlAttributeEscaper().escape(l), XmlEscapers.xmlAttributeEscaper().escape(logFile))
            }
            read(r, logFile)
        } else {
            r.close()
            log.info("read() Shutdown!")
            self ! "doneRead"
        }
    }

    def loopRead(r: BufferedReader, logFile: String): Unit = {
        while (!Thread.currentThread().isInterrupted) {
            val l = r.readLine
            if (l != null) {
//                log.info(s"read line: $l")
                // pass to colorizer if it's up, otherwise skip it and go straight to bridge
                colorizer.getOrElse(bridge) ! new LogMessage(l, logFile)
            } else {
                try {
                    // wait a bit for some more logs...
                    Thread.sleep(sleepIntervalForUpdates)
                } catch {
                    // clean up if we're sleeping when it's time to quit
                    case ie: InterruptedException => Thread.currentThread().interrupt()
                }
            }
        }
        r.close()
        log.info("loopRead() shutdown!")
        self ! "doneRead"
    }

    def receive = {
        case LogThisFile(logFile) =>
            log.debug(s"About to begin logging $logFile")
            // calculate bytes to skip to get to last N bytes of file
            val file: File = new File(logFile)
            val readLastNBytes = 100
            val skipBytes = file.length() - readLastNBytes

            // begin reading
            val r = new BufferedReader(new InputStreamReader(Tail.follow(file)))
            val readerThread = new Thread(new Runnable {
                def run() {
                    readLastLines(r, skipBytes, logFile)
                }
            })

            readerThread.setDaemon(true)
            readerThread.start()

            readerThreads += readerThread
        case cref: ActorRef =>
            // load up the colorizer
            log.debug(s"got the colorzier! $cref")
            colorizer = Some(cref)
            log.debug(s"the colorizer.getOrElse -> ${colorizer.getOrElse("nada hombre!")}")
        case ServiceShutdown =>
            log.info("shutting down read thread")
            readerThreads.foreach(thread => thread.interrupt())
        case "doneRead" =>
            log.info("Read thread shut down. Shutting down self...")
            context stop self
        case something => log.warning(s"huh? what's this: $something")
    }
}




