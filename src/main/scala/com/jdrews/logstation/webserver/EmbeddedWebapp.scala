package com.jdrews.logstation.webserver

class EmbeddedWebapp(val port: Int = 8080, val contextPath: String = "/") {

    import org.eclipse.jetty.server.Server
    import org.eclipse.jetty.server.nio.SelectChannelConnector
    import org.eclipse.jetty.webapp.WebAppContext

    val connector = new SelectChannelConnector()
    connector.setPort(port)

    val server = new Server()
    server.addConnector(connector)

    val context = new WebAppContext()
    context.setContextPath(contextPath)
    context.setWar("../webapp")
    server.setHandler(context)

    def start() = server.start
    def stop() = server.stop

}