package com.jdrews.logstation.webserver.comet

import akka.actor.{ActorRef, PoisonPill}
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.utils.FixedList
import com.jdrews.logstation.webserver.LogMessage
import net.liftweb.actor.LAPinger
import net.liftweb.common.{Full, Loggable}
import net.liftweb.http.js.JE.{JsRaw, JsFunc, Call, ValById}
import net.liftweb.http.js.{JsCmd, Jx, JsCmds}
import net.liftweb.http.js.jquery.JqJE.{JqAppend, JqId}
import net.liftweb.http.js.jquery.JqJsCmds
import net.liftweb.http.{RenderOut, CometActor, CometListener}
import net.liftweb.util.ClearClearable

import scala.collection.mutable._
import scala.collection.mutable.HashMap
import scala.xml.NodeSeq

/**
  * The screen real estate on the browser will be represented
  * by this component.  When the component changes on the server
  * the changes are automatically reflected in the browser.
  */
class LogStationPage extends CometActor with CometListener with Loggable {
    override def defaultPrefix = Full("comet")

    /**
      * When the component is instantiated, register as
      * a listener with the ChatServer
      */
     def registerWith = LogStationWebServer

     /**
      * The CometActor is an Actor, so it processes messages.
      * In this case, we're listening for Vector[String],
      * and when we get one, update our private state
      * and reRender() the component.  reRender() will
      * cause changes to be sent to the browser.
      */
     override def lowPriority = {
         case lm: LogMessage =>
             logger.info(s"got LogMessage: $lm")
             partialUpdate(JsFunc("addOrAppendLogMessage", lm.logFile, lm.logMessage).cmd)
         case firstMsgs: FixedList[LogMessage] =>
             firstMsgs.foreach{ lm =>
                 logger.info(s"sending first message: $lm")
                 partialUpdate(JsFunc("addOrAppendLogMessage", lm.logFile, lm.logMessage).cmd)
             }
         case maxLogLinesPerLog: Int =>
             partialUpdate(JsFunc("updateMaxLogLinesPerLog", maxLogLinesPerLog).cmd)
         case something =>
             logger.info(s"in LogStationPage: got something, not sure what it is: $something")

     }

    // this should never be called, but needed to comply with CometActor
    def render = ClearClearable

 }