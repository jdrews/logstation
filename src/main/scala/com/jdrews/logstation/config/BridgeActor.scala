package com.jdrews.logstation.config

import akka.actor.{ActorLogging, Actor}
import net.liftweb.http.CometActor

/**
 * Created by jdrews on 3/22/2015.
 */
class BridgeActor extends Actor with ActorLogging {
    private var target: Option[CometActor] = None
    def receive = {
        case comet: CometActor =>
            log.info(s"received comet: $comet")
            target = Some(comet)
        case msg =>
            log.info(s"passing the following to $target: $msg")
            target.foreach(_ ! msg)
    }
}
