package bootstrap.liftweb

import net.liftmodules.JQueryModule
import net.liftweb.http.{Html5Properties, LiftRules, Req}
import net.liftweb.sitemap.{SiteMap, Menu}

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

         LiftRules.useXhtmlMimeType = false

         // Build SiteMap
         def sitemap(): SiteMap = SiteMap(
             Menu.i("Home") / "index"
         )

         JQueryModule.InitParam.JQuery=JQueryModule.JQuery111Z
         JQueryModule.init()
     }
 }