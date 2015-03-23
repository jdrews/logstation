package com.jdrews.logstation.config

import akka.actor.ActorSystem
import com.typesafe.config.ConfigFactory

/**
 * To create Single Actor System thought out the application
 */
object GlobalActorSystem {

    val localconfigString = """include "reference""""
    val system = ActorSystem("LogStation", ConfigFactory.load(ConfigFactory.parseString(localconfigString)))
    def getActorSystem = {
        system
    }
}