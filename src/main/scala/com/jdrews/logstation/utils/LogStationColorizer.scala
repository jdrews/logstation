package com.jdrews.logstation.utils

import akka.actor.{Terminated, Props, ActorLogging, Actor}
import akka.pattern._
import com.jdrews.logstation.service.ServiceShutdown
import com.jdrews.logstation.tailer.{LogTailerActor, LogThisFile}
import com.jdrews.logstation.webserver.LogMessage
import com.typesafe.config.{ConfigRenderOptions, Config, ConfigFactory}

import scala.concurrent.Await
import scala.util.matching.Regex

/**
 * Created by jdrews on 4/12/2015.
 */
class LogStationColorizer extends Actor with ActorLogging {
    var syntaxList = scala.collection.mutable.Map[String, Regex]()
    def receive = {
        case syntax: Map[String, Regex] =>
            log.info(s"Got config $syntax}")
            // load up the syntaxes
            //TODO: Fix this...
            syntaxList = syntax

        case lm: LogMessage =>
            // colorize it!

            // send it to bridge actor

        case ServiceShutdown =>
            context stop self
        case actTerminated: Terminated => log.info(actTerminated.toString)
        case something => log.warning(s"huh? $something")
    }
}
