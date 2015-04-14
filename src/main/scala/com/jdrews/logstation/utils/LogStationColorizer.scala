package com.jdrews.logstation.utils

import akka.actor.{Terminated, Props, ActorLogging, Actor}
import akka.pattern._
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.service.ServiceShutdown
import com.jdrews.logstation.tailer.{LogTailerActor, LogThisFile}
import com.jdrews.logstation.webserver.LogMessage
import com.typesafe.config.{ConfigRenderOptions, Config, ConfigFactory}

import scala.concurrent.Await
import scala.util.control.Breaks
import scala.util.matching.Regex

/**
 * Created by jdrews on 4/12/2015.
 */
class LogStationColorizer extends Actor with ActorLogging {
    var syntaxList = scala.collection.mutable.Map[String, Regex]()
    private val bridge = BridgeController.getBridgeActor
    def receive = {
        case syntax: scala.collection.mutable.Map[String, Regex] =>
            log.info(s"Got config $syntax}")
            // load up the syntaxes
            syntaxList = syntax

        case lm: LogMessage =>
            var msg = lm.logMessage
            // colorize it!
            val loop = new Breaks
            loop.breakable {
                syntaxList.foreach(syntax =>
                    if (syntax._2.findFirstIn(lm.logMessage).isDefined) {
                        log.info(s"got a match! ${syntax._1}")
                        msg = s"<span style='color:${syntax._1}'>${lm.logMessage}</span>"
                        loop.break
                    }
                )
            }

            // send it to bridge actor
            bridge ! LogMessage(msg, lm.logFile)

        case ServiceShutdown =>
            context stop self
        case actTerminated: Terminated => log.info(actTerminated.toString)
        case something => log.warning(s"huh? $something")
    }
}
