package service

import akka.actor._
import akka.pattern._
import util.{LogTailerActor, LogThisFile}

import scala.concurrent.Await
import scala.concurrent.duration._

/**
 * Created by jdrews on 2/21/2015.
 */
class LogStationServiceActor extends Actor with ActorLogging{
    private var logTailers = Set.empty[ActorRef]

    def receive = {
        case logThisFile: LogThisFile =>
            log.info(s"About to begin logging ${logThisFile.logFile}")

            val logTailerActor = context.actorOf(Props[LogTailerActor],
                name = s"LogTailerActor-${logThisFile.logFile.replaceAll("[^A-Za-z0-9]", ":")}")
            logTailerActor ! logThisFile
            context watch logTailerActor
            logTailers += logTailerActor
        case ServiceShutdown =>
            // for each logTailers, send shutdown call and wait for it to shut down.
            log.info("got ServiceShutdown")
            // TODO: This doesn't end cleanly. Probably because read() on LogTailerActor is blocking...
            logTailers.foreach(actor =>
                try {
                    Await.result(gracefulStop(actor, 20 seconds, ServiceShutdown), 20 seconds)
                } catch {
                    case e: AskTimeoutException ⇒ log.error("The actor didn't stop in time!" + e.toString)
                }
            )
            context.system.shutdown()
        case actTerminated: Terminated => log.info(actTerminated.toString)
        case something => log.warning(s"huh? $something")
    }
}
