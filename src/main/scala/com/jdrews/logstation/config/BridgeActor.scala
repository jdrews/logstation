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
    private val bufferLength = 1000
    private var msgs = new FixedList[Any](bufferLength)
    def receive = {
        case lift: LiftActor =>
            log.info(s"received LiftActor: $lift")
            target = Some(lift)
            if (msgs.nonEmpty) {
                log.info("clearing out buffered msgs")
                msgs.foreach{ m =>
                    log.info(s"passing the following to $target: $m")
                    target.foreach(_ ! m)
                }
                log.info("done. emptying msgs buffer")
                msgs = new FixedList[Any](10)
            }
        case msg =>
            if (target.isEmpty) {
                log.info(s"buffering this message since target is empty... $msg")
                msgs.append(msg)
            } else {
                log.info(s"passing the following to $target: $msg")
                target.foreach(_ ! msg)
            }

    }
}
