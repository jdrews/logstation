package com.jdrews.logstation.config

import akka.actor.{Actor, ActorLogging}
import com.jdrews.logstation.utils.FixedList
import com.jdrews.logstation.{BufferLength, LogStationName, MaxLogLinesPerLog}
import net.liftweb.actor.LiftActor

/**
 * Created by jdrews on 3/22/2015.
 *
 * Used to bridge between Lift and Scala
 * Buffers up messages before a LiftActor connects and then hands over messages
 * Stores configuration for the LiftActor
 */
class BridgeActor extends Actor with ActorLogging {
    private var target: Option[LiftActor] = None
    // only store n entries
    private var bufferLength = 12
    private var maxLogLinesPerLog = 120
    private var msgs = new FixedList[Any](bufferLength)
    private var logStationName = ""
    def receive = {
        case lift: LiftActor =>
            log.debug(s"received LiftActor: $lift")
            target = Some(lift)

            // send LogStationWebServer the maxLogLinesPerLog
            lift ! MaxLogLinesPerLog(maxLogLinesPerLog)
            lift ! LogStationName(logStationName)

            if (msgs.nonEmpty) {
                log.debug("sending out buffered msgs")
                msgs.foreach{ m =>
                    log.debug(s"passing the following to $lift: $m")
                    lift ! m
                }
                log.debug("done")
            }
        case mll: MaxLogLinesPerLog =>
            log.debug(s"received maxLogLinesPerLog: $mll")
            maxLogLinesPerLog = mll.myVal
        case bl: BufferLength =>
            log.debug(s"received bufferLength: $bl")
            bufferLength = bl.myVal
            // rebuild msgs list with new buffer length
            msgs = new FixedList[Any](bufferLength)
        case lsname: LogStationName =>
            log.debug(s"received logStationName: $logStationName")
            logStationName = lsname.myVal
        case msg =>
            if (target.isEmpty) {
                log.debug(s"buffering this message since target is empty... $msg")
                msgs.append(msg)
            } else {
                log.debug(s"passing the following to $target: $msg")
                target.foreach(_ ! msg)
            }
    }
}
