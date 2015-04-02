package com.jdrews.logstation.webserver.comet

import akka.actor.{ActorRef, PoisonPill}
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.webserver.LogMessage
import net.liftweb.actor.LAPinger
import net.liftweb.common.{Full, Loggable}
import net.liftweb.http.{CometActor, CometListener}
import net.liftweb.util.ClearClearable

/**
  * The screen real estate on the browser will be represented
  * by this component.  When the component changes on the server
  * the changes are automatically reflected in the browser.
  */
class LogStationPage extends CometActor with CometListener with Loggable {
    private var msgs: Vector[String] = Vector("") // private state​
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
         case v: Vector[String] =>
             logger.info(s"got some strings: $v")
             msgs = v
             reRender()

         case l: LogMessage =>
             logger.info(s"got a LogMessage: $l")
             msgs = msgs :+ s"${l.logFile}: ${l.logMessage}"
             reRender()
         case something =>
             logger.info(s"in LogStationPage: got something, not sure what it is: $something")
     }
    /**
      * Put the messages in the li elements and clear
      * any elements that have the clearable class.
      */
     def render = "li *" #> msgs
 }