package com.jdrews.logstation.webserver.comet

import akka.actor.{PoisonPill, ActorRef}
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.webserver.LogMessage
import net.liftweb.actor._
import net.liftweb.common.Loggable
import net.liftweb.http._

/**
 * Created by jdrews on 2/21/2015.
 */

object LogStationWebServer extends LiftActor with ListenerManager with Loggable {
    private var msgs = Vector("--------------------------------")
    logger.info("at the front of LogStationWebServer...")

    // A bridge between the Lift and Akka actor libraries
    private lazy val bridge: ActorRef = BridgeController.getBridgeActor
    bridge ! this

    // Make sure to stop our BridgeActor when we clean up Comet
//    override protected def localShutdown() {
//        bridge ! PoisonPill
//    }

    /**
     * When we update the listeners, what message do we send?
     * We send the msgs, which is an immutable data structure,
     * so it can be shared with lots of threads without any
     * danger or locking.
     */
    def createUpdate = msgs

    /**
     * process messages that are sent to the Actor.  In
     * this case, we're looking for Strings that are sent
     * to the ChatServer.  We append them to our Vector of
     * messages, and then update all the listeners.
     */
    override def lowPriority = {
        case s: String => msgs :+= s; updateListeners()

        case lm: LogMessage =>
            logger.info(s"got log message $lm")
            msgs :+= s"${lm.logFile}, ${lm.logMessage}"
            updateListeners()
        case something =>
            logger.info(s"in LogStationWebServer: got something, not sure what it is: $something")

//        case ServiceShutdown =>
//            log.info("Received ServiceShutdown. Shutting down...")
//            context stop self
    }

}