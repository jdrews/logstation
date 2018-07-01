package com.jdrews.logstation.webserver.comet

import akka.actor.ActorRef
import com.jdrews.logstation.config.BridgeController
import com.jdrews.logstation.utils.FixedList
import com.jdrews.logstation.webserver.LogMessage
import com.jdrews.logstation.{BufferLength, LogStationName, MaxLogLinesPerLog}
import net.liftweb.actor._
import net.liftweb.common.Loggable
import net.liftweb.http._

/**
 * Created by jdrews on 2/21/2015.
 *
 * Communicates with LogStationPages to push updates to the web page
 */

case class NewListenerPackage ( maxLogLinesPerLog: Int, logStationName: String, msgs: List[LogMessage])

object LogStationWebServer extends LiftActor with ListenerManager with Loggable {
    private var maxLogLinesPerLog = 130
    private var bufferLength = 17
    private var logStationName = ""
    private var msgs = new FixedList[LogMessage](bufferLength)

    logger.debug("at the front of LogStationWebServer...")

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
    def createUpdate = {
        logger.info("client connected")
        NewListenerPackage(maxLogLinesPerLog, logStationName, msgs.toList)
    }

    /**
     * process messages that are sent to the Actor.
     */
    override def lowPriority = {
        case lm: LogMessage =>
            logger.debug(s"got log message $lm")
            // update client
            sendListenersMessage(lm)
            // store a copy in fixed list so we have something to send new clients
            msgs.append(lm)
        case mll: MaxLogLinesPerLog =>
            logger.debug(s"received maxLogLinesPerLog: $mll")
            maxLogLinesPerLog = mll.myVal
            sendListenersMessage(maxLogLinesPerLog)
        case bl: BufferLength =>
            logger.debug(s"received bufferLength: $bl")
            bufferLength = bl.myVal
            // rebuild msgs list with new buffer length
            msgs = new FixedList[LogMessage](bufferLength)
        case lsname: LogStationName =>
            logger.debug(s"received logStationName: $lsname")
            logStationName = lsname.myVal
            sendListenersMessage(lsname)
        case something =>
            logger.warn(s"in LogStationWebServer: got something, not sure what it is: $something")

//        case ServiceShutdown =>
//            log.info("Received ServiceShutdown. Shutting down...")
//            context stop self
    }

}