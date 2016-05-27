package com.jdrews.logstation.config

import akka.actor.{ActorLogging, Actor}
import com.jdrews.logstation.utils.FixedList
import net.liftweb.actor.LiftActor
import net.liftweb.http.CometActor

/**
 * Created by jdrews on 3/22/2015.
 */
class BridgeActor extends Actor with ActorLogging {
    private var target: Option[LiftActor] = None
    // only store n entries
    // TODO: make bufferLength an option-- for offline buffering before a web client connects
    private val bufferLength = 1000
    private var maxLogLinesPerLog = 120
    private var msgs = new FixedList[Any](bufferLength)
    def receive = {
        case lift: LiftActor =>
            log.info(s"received LiftActor: $lift")
            target = Some(lift)

            // send LogStationWebServer the maxLogLinesPerLog
            lift ! maxLogLinesPerLog

            if (msgs.nonEmpty) {
                log.info("clearing out buffered msgs")
                msgs.foreach{ m =>
                    log.info(s"passing the following to $lift: $m")
                    lift ! m
                }
                log.info("done. emptying msgs buffer")
                // TODO: always maintain this bufferlist-- and if a new client connects-- send it this buffer list.
                msgs = new FixedList[Any](bufferLength)
            }
        case msg =>
            if (target.isEmpty) {
                log.info(s"buffering this message since target is empty... $msg")
                msgs.append(msg)
            } else {
                log.info(s"passing the following to $target: $msg")
                target.foreach(_ ! msg)
            }
        case mll: Int =>
            log.info(s"received maxLogLinesPerLog: $mll")
            maxLogLinesPerLog = mll
    }
}
