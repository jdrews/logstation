package service

import akka.actor.{ActorRef, Props, Actor, ActorLogging}
import util.{LogTailerActor, LogThisFile}

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
            context.system.shutdown()
        case _       => println("huh?")
    }
}
