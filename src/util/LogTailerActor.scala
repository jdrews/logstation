package util

import java.io._

import akka.actor.{ActorLogging, Actor}
import com.osinka.tailf.Tail
import service.ServiceShutdown

/**
 * Created by jdrews on 2/21/2015.
 */
class LogTailerActor extends Actor with ActorLogging {

    def countLines(file: File) = {
        val lnr = new LineNumberReader(new FileReader(file))
        lnr.skip(Long.MaxValue)
        val lineNumbers = lnr.getLineNumber() + 1
        lnr.close()
        lineNumbers
    }

    def receive = {
        case LogThisFile(logFile) =>
            log.info(s"About to begin logging $logFile")
            val file: File = new File(logFile)
            val readLastNBytes = 100
            val skipBytes = file.length() - readLastNBytes

            val r = new BufferedReader(new InputStreamReader(Tail.follow(file)))

            def readLastLines: Unit = {
                r.skip(skipBytes)
                // read off any garbage line
                r.readLine()
                // back to normal tailing
                read
            }

            def read: Unit = {
                val l = r.readLine
                if (l != null) {
                    log.info("read line: " + l)
                    read
                }
            }
            readLastLines

        case ServiceShutdown =>
            context.system.shutdown()
        case something => println(s"huh? what's this: $something")
    }
}


