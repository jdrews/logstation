package com.jdrews.logstation

import akka.actor.Props
import akka.event.Logging
import akka.pattern._
import com.jdrews.logstation.config.{DefaultConfigHolder, BridgeController, GlobalActorSystem}
import com.jdrews.logstation.service.{LogStationServiceActor, ServiceShutdown}
import com.jdrews.logstation.tailer.LogThisFile
import com.jdrews.logstation.webserver.{LogMessage, EmbeddedWebapp}
import com.typesafe.config.{ConfigRenderOptions, Config, ConfigFactory}
import collection.JavaConversions._
import scala.concurrent.Await
import scala.concurrent.duration._
import java.io.{BufferedWriter, FileWriter, File}

import scala.util.matching.Regex


/**
 * Created by jdrews on 2/21/2015.
 */

//TODO: pass in maxLogLinesPerLog from configuration file
//TODO: fix the user lockout follow (or disable altogether) -- add button to scroll to bottom (maybe make it hover or something cool like that?)
//TODO: how does it work with multiple clients?
object LogStation extends App {
    if (!new java.io.File("logstation.conf").exists) {
        makeConfAndShutdown
    }
    val system = GlobalActorSystem.getActorSystem
    val logger = Logging.getLogger(system, getClass)
    sys.addShutdownHook(shutdown)
    val conf = ConfigFactory.parseFile(new File("logstation.conf"))
    val syntaxList = scala.collection.mutable.Map[String, Regex]()
    if (conf.hasPath("logstation.syntax")) {
        //TODO: redo this so LogTailerActor skips LogStationColorizer if it doesn't exist
        val syntaxes = conf.getConfig("logstation.syntax").entrySet()
        //filter through each config of syntax and convert into map
        syntaxes.foreach(syntax => {
            val matchList: java.util.ArrayList[String] = syntax.getValue().unwrapped().asInstanceOf[java.util.ArrayList[String]]
            logger.info(matchList.toString)
            syntaxList(matchList.get(0)) = matchList.get(1).r
        })
    }
    logger.info(s"syntaxList: $syntaxList")

    val maxLogLinesPerLog = {
        if (conf.hasPath("logstation.maxLogLinesPerLog")) {
            val maxLogLinesPerLog = conf.getInt("logstation.maxLogLinesPerLog")
            logger.info(s"maxLogLinesPerLog (user set): $maxLogLinesPerLog")
            maxLogLinesPerLog
        } else {
            val maxLogLinesPerLog = 110
            logger.info(s"maxLogLinesPerLog (default): $maxLogLinesPerLog")
            maxLogLinesPerLog
        }
    }

    val logs = conf.getStringList("logstation.logs").toList

    // Start up the BridgeActor
    private val bridge = BridgeController.getBridgeActor
    bridge ! maxLogLinesPerLog

    // Start up the embedded webapp
    val webServer = new EmbeddedWebapp(8080, "/")
    webServer.start()

    // Fire up the LogStationServiceActor and push it the files to begin tailing
    val logStationServiceActor = system.actorOf(Props[LogStationServiceActor], name = "LogStationServiceActor")
    logStationServiceActor ! syntaxList
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

    private def makeConfAndShutdown: Unit = {
        println("Welcome to logstation! Creating default logstation.conf...")
        val file = new File("logstation.conf")
        val bw = new BufferedWriter(new FileWriter(file))
        bw.write(DefaultConfigHolder.defaultConfig)
        bw.close()
        println("Please setup your logstation.conf located here: " + file.getAbsolutePath())
        System.exit(0)
    }
}
