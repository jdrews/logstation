package webserver

import akka.actor.ActorRef
import akka.io.IO
import spray.can.Http

/**
 * Created by jdrews on 2/21/2015.
 */
class LogStationWebServer {

    val myListener: ActorRef = // ...

//        IO(Http) ! Http.Bind(myListener, interface = "localhost", port = 8080)
}
