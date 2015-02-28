package util

import java.io._

import akka.actor.{ActorLogging, Actor}
import com.osinka.tailf.Tail
import service.ServiceShutdown
/**
 * Created by jdrews on 2/21/2015.
 */
class LogTailerActor extends Actor with ActorLogging {
    private var readerThreads = Set.empty[Thread]
//    def countLines(file: File) = {
//        val lnr = new LineNumberReader(new FileReader(file))
//        lnr.skip(Long.MaxValue)
//        val lineNumbers = lnr.getLineNumber() + 1
//        lnr.close()
//        lineNumbers
//    }

    def readLastLines(r: BufferedReader, skipBytes: Long): Unit = {
        if (skipBytes > 0) {
            r.skip(skipBytes)
            // read off any garbage line
            r.readLine()
            // back to normal tailing
        }
        read(r)
    }

    def read(r: BufferedReader): Unit = {
        if (!Thread.currentThread().isInterrupted) {
            val l = r.readLine
            if (l != null) {
                log.info("read line: " + l)
            }
            read(r)
        } else {
            r.close()
            log.info("read() Shutdown!")
            self ! "doneRead"
        }

    }

    def receive = {
        case LogThisFile(logFile) =>
            log.info(s"About to begin logging $logFile")
            // calculate bytes to skip to get to last N bytes of file
            val file: File = new File(logFile)
            val readLastNBytes = 100
            val skipBytes = file.length() - readLastNBytes

            // begin reading
            val r = new BufferedReader(new InputStreamReader(Tail.follow(file)))
            val readerThread = new Thread(new Runnable {
                def run() {
                    readLastLines(r, skipBytes)
                }
            })

            readerThread.setDaemon(true)
            readerThread.start()

            readerThreads += readerThread

        case ServiceShutdown =>
            log.info("shutting down read thread")
            readerThreads.foreach( thread => thread.interrupt())
        case "doneRead" =>
            log.info("Read thread shut down. Shutting down self...")
            context stop self
        case something => log.warning(s"huh? what's this: $something")
    }
}




