package com.jdrews.logstation.webserver.comet

import com.jdrews.logstation.webserver.LogMessage
import net.liftweb.common.{Full, Loggable}
import net.liftweb.http.js.JE.JsFunc
import net.liftweb.http.{CometActor, CometListener}
import net.liftweb.util.ClearClearable

/**
  * The screen real estate on the browser will be represented
  * by this component.  When the component changes on the server
  * the changes are automatically reflected in the browser.
  */
class LogStationPage extends CometActor with CometListener with Loggable {
    override def defaultPrefix = Full("comet")
    private var maxLogLinesPerLog = 170

     def registerWith = LogStationWebServer

     override def lowPriority = {
         case lm: LogMessage =>
             logger.info(s"got LogMessage: $lm")
             partialUpdate(JsFunc("addOrAppendLogMessage", lm.logFile, lm.logMessage).cmd)
         case nlp: NewListenerPackage =>
            logger.info(s"received a new listener package: $nlp")
            partialUpdate(JsFunc("updateMaxLogLinesPerLog", nlp.maxLogLinesPerLog).cmd)
             nlp.msgs.foreach{ lm =>
                 logger.info(s"passing the following up: $lm")
                partialUpdate(JsFunc("addOrAppendLogMessage", lm.logFile, lm.logMessage).cmd)
             }
         case mll: Int =>
             partialUpdate(JsFunc("updateMaxLogLinesPerLog", mll).cmd)
             maxLogLinesPerLog = mll
         case something =>
             logger.info(s"in LogStationPage: got something, not sure what it is: $something")

     }

    def render = {
        partialUpdate(JsFunc("updateMaxLogLinesPerLog", maxLogLinesPerLog).cmd)
        partialUpdate(JsFunc("enableScrollFollow").cmd)
        partialUpdate(JsFunc("enablePlay").cmd)
        ClearClearable
    }

 }