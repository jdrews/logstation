import java.io.File

import akka.event.Logging
import org.apache.commons.io.input.{Tailer, TailerListener}
import service.LogStationServiceActor
import util.LogTailer
import util.LogThisFile

import akka.actor.ActorSystem
import akka.actor.Props
import akka.pattern._
import scala.concurrent.Await
import scala.concurrent.duration._

/**
 * Created by jdrews on 2/21/2015.
 */

//TODO: Get akka in here
//TODO: get spray in here to host up website
//TODO: website should scroll, but allow user to pause scrolling
//TODO: config files to hold properties for locations of log files
//TODO: config for coloring logs
//TODO: color logs in web page
object LogStation extends App {
    sys.addShutdownHook(shutdown)
    val system = ActorSystem("LogStation")
    val logger = Logging.getLogger(system, getClass)

    val logStationServiceActor = system.actorOf(Props[LogStationServiceActor], name = "LogStationServiceActor")

    val logFile1 = new LogThisFile("E:\\git\\logstation\\test\\logfile.log")
    logStationServiceActor ! logFile1


    private def shutdown: Unit = {
        logger.info("Shutdown hook caught.")

        try {
            Await.result(gracefulStop(logStationServiceActor, 20 seconds), 20 seconds)
        } catch {
            case e: AskTimeoutException ⇒ logger.error("The actor didn't stop in time!" + e.toString)
        }
        system.shutdown()
        system.awaitTermination()
        logger.info("Done shutting down.")
    }
}
