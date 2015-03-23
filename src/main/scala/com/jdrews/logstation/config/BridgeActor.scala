package com.jdrews.logstation.config

import akka.actor.Actor
import net.liftweb.http.CometActor

/**
 * Created by jdrews on 3/22/2015.
 */
class BridgeActor extends Actor {
    private var target: Option[CometActor] = None
    def receive = {
        case comet: CometActor => target = Some(comet)
        case msg => target.foreach(_ ! msg)
    }
}
