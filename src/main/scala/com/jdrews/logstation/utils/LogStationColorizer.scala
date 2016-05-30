package com.jdrews.logstation.utils

import akka.actor.{Actor, ActorLogging, Terminated}
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.service.ServiceShutdown
import com.jdrews.logstation.webserver.LogMessage

import scala.util.control.Breaks
import scala.util.matching.Regex

/**
 * Created by jdrews on 4/12/2015.
 *
 * Uses a syntaxList to turn LogMessages into colorized messages
 * Wraps the text in a <span/> to colorize it in the web page
 */
class LogStationColorizer extends Actor with ActorLogging {
    // contains a map of syntaxName to regular expression.
    var syntaxList = scala.collection.mutable.Map[String, Regex]()
    private val bridge = BridgeController.getBridgeActor
    def receive = {
        case syntax: scala.collection.mutable.Map[String, Regex] =>
            log.debug(s"Got config $syntax}")
            // load up the syntaxes
            syntaxList = syntax

        case lm: LogMessage =>
            var msg = lm.logMessage
            // colorize it!
            val loop = new Breaks
            loop.breakable {
                // for each syntax in list
                syntaxList.foreach(syntax =>
                    // get the first syntax regex, and find the first one to match the log message
                    if (syntax._2.findFirstIn(lm.logMessage).isDefined) {
                        // log.debug(s"got a match! ${syntax._1}")
                        // wrap log message in new colors
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
