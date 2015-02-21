package util

/**
 * Created by jdrews on 2/21/2015.
 */

import org.apache.commons.io.input.TailerListenerAdapter

class LogTailer extends TailerListenerAdapter {
    override def handle(line: String) {
        System.out.println("got this line: " + line)
    }
}
