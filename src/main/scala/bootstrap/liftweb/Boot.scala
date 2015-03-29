package bootstrap.liftweb

import net.liftmodules.JQueryModule
import net.liftweb.http.{Html5Properties, Req, LiftRules}
import net.liftweb.sitemap.{Menu, SiteMap}

/**
  * A class that's instantiated early and run.  It allows the application
  * to modify lift's environment
  */
class Boot {
     def boot {
         // where to search snippet
         LiftRules.addToPackages("com.jdrews.logstation.webserver")

         // Use HTML5 for rendering
         LiftRules.htmlProperties.default.set((r: Req) =>
             new Html5Properties(r.userAgent))

         JQueryModule.InitParam.JQuery=JQueryModule.JQuery1111
         JQueryModule.init()
     }
 }