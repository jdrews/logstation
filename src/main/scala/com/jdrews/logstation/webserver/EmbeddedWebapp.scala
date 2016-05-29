package com.jdrews.logstation.webserver

import akka.event.Logging
import com.jdrews.logstation.LogStation._
import com.jdrews.logstation.config.GlobalActorSystem

class EmbeddedWebapp(val port: Int = 8884, val contextPath: String = "/") {

    val system = GlobalActorSystem.getActorSystem
    val logger = Logging.getLogger(system, getClass)

    import org.eclipse.jetty.server.Server
    import org.eclipse.jetty.server.nio.SelectChannelConnector
    import org.eclipse.jetty.webapp.WebAppContext

    val connector = new SelectChannelConnector()
    connector.setPort(port)

    val server = new Server()
    server.addConnector(connector)

    val context = new WebAppContext()
    context.setContextPath(contextPath)
    val warUrlString = this.getClass.getClassLoader.getResource("webapp").toExternalForm()
    logger.info(s"warUrlString: $warUrlString")
    context.setWar(warUrlString)
    server.setHandler(context)

    def start() = server.start
    def stop() = server.stop

}