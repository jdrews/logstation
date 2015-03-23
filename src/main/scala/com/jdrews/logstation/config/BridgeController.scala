package com.jdrews.logstation.config

import akka.actor.ActorRef
import net.liftweb.common.Loggable

/**
 * Controls the life-cycle of Actor Bridges
 */
object BridgeController extends Loggable {

    def getBridgeActor: ActorRef = {
        GlobalActorSystem.getActorSystem.actorOf(akka.actor.Props[BridgeActor])
    }
}
