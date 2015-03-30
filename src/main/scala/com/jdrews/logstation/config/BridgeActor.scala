package com.jdrews.logstation.config

import akka.actor.{ActorLogging, Actor}
import net.liftweb.actor.LiftActor
import net.liftweb.http.CometActor

/**
 * Created by jdrews on 3/22/2015.
 */
class BridgeActor extends Actor with ActorLogging {
    private var target: Option[LiftActor] = None
    private var msgs: Vector[Any] = Vector.empty[Any]
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
                msgs = Vector.empty[Any]
            }
        case msg =>
            if (target.isEmpty) {
                log.info(s"buffering this message since target is empty... $msg")
                msgs :+= msg
            } else {
                log.info(s"passing the following to $target: $msg")
                target.foreach(_ ! msg)
            }

    }
}
