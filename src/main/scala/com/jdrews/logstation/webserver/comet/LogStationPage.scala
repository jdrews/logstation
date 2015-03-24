package com.jdrews.logstation.webserver.comet

import akka.actor.{ActorRef, PoisonPill}
import com.jdrews.logstation.config.BridgeController
import net.liftweb.common.Loggable
import net.liftweb.http.{CometActor, CometListener}
import net.liftweb.util.ClearClearable

/**
  * The screen real estate on the browser will be represented
  * by this component.  When the component changes on the server
  * the changes are automatically reflected in the browser.
  */
class LogStationPage extends CometActor with CometListener with Loggable {
    private var msgs: Vector[String] = Vector("") // private state​

    // A bridge between the Lift and Akka actor libraries
    private lazy val bridge: ActorRef = BridgeController.getBridgeActor
    bridge ! this

    // Make sure to stop our BridgeActor when we clean up Comet
    override protected def localShutdown() {
        bridge ! PoisonPill
    }

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
             msgs = v
             reRender()
         case something =>
             logger.info(s"in LogStationPage: got something, not sure what it is: $something")
     }
    /**
      * Put the messages in the li elements and clear
      * any elements that have the clearable class.
      */
     def render = "li *" #> msgs & ClearClearable
 }