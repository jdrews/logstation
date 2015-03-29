package com.jdrews.logstation.config

import akka.actor.{ActorLogging, Actor}
import net.liftweb.actor.LiftActor
import net.liftweb.http.CometActor

/**
 * Created by jdrews on 3/22/2015.
 */
class BridgeActor extends Actor with ActorLogging {
    private var target: Option[LiftActor] = None
    def receive = {
        case lift: LiftActor =>
            log.info(s"received LiftActor: $lift")
            target = Some(lift)
        case msg =>
            log.info(s"passing the following to $target: $msg")
            target.foreach(_ ! msg)
    }
}
