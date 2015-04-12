package com.jdrews.logstation.config

/**
 * Created by jdrews on 4/12/2015.
 */
object DefaultConfigHolder {
    val defaultConfig =
        """
          |logstation {
          |    # Windows example of setting up logs
          |    logs=["C:\\git\\logstation\\test\\logfile.log","C:\\git\\logstation\\test\\logfile2.log"]
          |    # Unix example of setting up logs
          |    # logs=["/home/jdrews/git/logstation/logfile.log","/home/jdrews/git/logstation/logfile2.log"]
          |}
        """.stripMargin
}
