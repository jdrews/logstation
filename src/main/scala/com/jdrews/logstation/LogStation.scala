package com.jdrews.logstation

import akka.actor.Props
import akka.event.Logging
import akka.pattern._
import com.jdrews.logstation.config.{BridgeController, GlobalActorSystem}
import com.jdrews.logstation.service.{LogStationServiceActor, ServiceShutdown}
import com.jdrews.logstation.tailer.LogThisFile
import com.jdrews.logstation.webserver.{LogMessage, EmbeddedWebapp}
import com.typesafe.config.{ConfigRenderOptions, Config, ConfigFactory}
import collection.JavaConversions._
import scala.concurrent.Await
import scala.concurrent.duration._
import java.io.{BufferedWriter, FileWriter, File}


/**
 * Created by jdrews on 2/21/2015.
 */

//TODO: website should scroll, but allow user to pause scrolling
//TODO: config files to hold properties for locations of log files
//TODO: config for coloring logs
//TODO: color logs in web page
object LogStation extends App {
    sys.addShutdownHook(shutdown)

    val system = GlobalActorSystem.getActorSystem
    val logger = Logging.getLogger(system, getClass)
    if (!new java.io.File("application.conf").exists) {
        logger.info("creating default application.conf...")
        val configFile = """logstation {
    # Windows
    logs=["C:\\git\\logstation\\test\\logfile.log","C:\\git\\logstation\\test\\logfile2.log"]
    # Unix
    # logs=["/home/jdrews/git/logstation/logfile.log","/home/jdrews/git/logstation/logfile2.log"]
}
"""
        val file = new File("application.conf")
        val bw = new BufferedWriter(new FileWriter(file))
        bw.write(configFile)
        bw.close()
        Thread.sleep(1000)
    }
    val conf = ConfigFactory.load
    val logs = conf.getStringList("logstation.logs").toList

    // Start up the embedded webapp
    val webServer = new EmbeddedWebapp(8080, "/")
    webServer.start()

    // Fire up the LogStationServiceActor and push it the files to begin tailing
    val logStationServiceActor = system.actorOf(Props[LogStationServiceActor], name = "LogStationServiceActor")
    logs.foreach(log => logStationServiceActor ! new LogThisFile(log))

    private def shutdown: Unit = {
        logger.info("Shutdown hook caught.")
        webServer.stop

        try {
            Await.result(gracefulStop(logStationServiceActor, 20 seconds, ServiceShutdown), 20 seconds)
        } catch {
            case e: AskTimeoutException ⇒ logger.error("logStationServiceActor didn't stop in time!" + e.toString)
        }

        //        try {
        //            Await.result(gracefulStop(logStationWebServer, 20 seconds, ServiceShutdown), 20 seconds)
        //        } catch {
        //            case e: AskTimeoutException ⇒ logger.error("logStationWebServer didn't stop in time!" + e.toString)
        //        }

        system.shutdown()
        system.awaitTermination()
        logger.info("Done shutting down.")
    }
}
