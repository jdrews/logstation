package com.jdrews.logstation.config

import akka.actor.ActorRef
import akka.agent.Agent
import scala.concurrent.ExecutionContext.Implicits.global
import net.liftweb.common.Loggable


/**
 * Controls the life-cycle of Actor Bridges
 */
object BridgeController extends Loggable {
    //TODO: Pretty sure an agent (singleton) isn't the solution, but I want to get this working first
    // Then I'll figure out multiple comets and actors.
    private val bridge = GlobalActorSystem.getActorSystem.actorOf(akka.actor.Props[BridgeActor])

    val agent = Agent(bridge)

    def getBridgeActor: ActorRef = {
        agent.get
    }
}
