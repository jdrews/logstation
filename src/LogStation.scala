import java.io.File

import org.apache.commons.io.input.{Tailer, TailerListener}
import util.LogTailer
/**
 * Created by jdrews on 2/21/2015.
 */
object LogStation extends App {
    val sleepTime = 500

    sys.addShutdownHook(shutdown)

    val listener = new LogTailer()
    val file: File = new File("E:\\git\\logstation\\test\\logfile.log")
    val tailer = new Tailer(file, listener, 0.1.toLong, true)
    val thread = new Thread(tailer)
    thread.setDaemon(true) // optional
    thread.start()

    while (true) {
        Thread.sleep(sleepTime.toLong);
    }


    private def shutdown: Unit = {
        println("Shutdown hook caught.")
        Thread.sleep(1000)
        println("Done shutting down.")
    }
}
