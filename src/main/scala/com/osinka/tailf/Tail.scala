/**
 * Copyright (C) 2009 alaz <azarov@osinka.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.osinka.tailf

import java.io.{File, InputStream}
import java.lang.InterruptedException
import java.nio.channels.ClosedByInterruptException

object Tail {

    /**
     * Create InputStream reading from a log file
     *
     * Calls follow with reasonable defaults:
     * 3 open retries
     * 1 second waiting for new file after the previous has disappeared
     * 0.1 second waiting between reads
     */
    def follow(file: File): InputStream = {
        val maxRetries = 3
        val waitToOpen = 1000
        val waitBetweenReads = 100

            def sleep(msec: Long) = () =>
                try {
                    Thread.sleep(msec)
                } catch  {
                    case ie: InterruptedException =>
                        println("Interrupt handled")
                        Thread.currentThread().interrupt() // restore interrupted status
                }

        follow(file, maxRetries, sleep(waitToOpen), sleep(waitBetweenReads))
    }

    /**
     * Create InputStream reading from a log file
     *
     * Creates an Input Stream reading from a growing file, that may be rotated as well
     * @param file File handle to the log file
     * @openTries how many times to try to re-open the file
     * @openSleep a function to sleep between re-open retries
     * @rereadSleep a function to be called when the stream walked to the end of
        the file and need to wait for some more input
     * @return InputStream object
     */
    def follow(file: File, openTries: Int, openSleep: () => Unit, rereadSleep: () => Unit): InputStream = {
        import java.io.SequenceInputStream

        val e = new java.util.Enumeration[InputStream]() {
            def nextElement = new FollowingInputStream(file, rereadSleep)
            def hasMoreElements = testExists(file, openTries, openSleep)
        }

        new SequenceInputStream(e)
    }

    /**
     * Test file existence N times, wait between retries
     *
     * @param file file handle
     * @tries how many times to try
     * @sleep function to call between tests
     * @return true on success
     */
    def testExists(file: File, tries: Int, sleep: () => Unit): Boolean = {
        def tryExists(n: Int): Boolean =
            if (Thread.currentThread().isInterrupted) false
            else if (file.exists) true
            else if (n > tries) false
            else {
                sleep()
                tryExists(n+1)
            }

        tryExists(1)
    }
}

/**
 * InputStream that handles growing file case
 *
 * The InputStream will not raise EOF when it comes to the file end. Contrary,
 * it will wait and continue reading.
 *
 * It will not handle the case when the file has been rotated. In this case,
 * it behaves just if it found EOF.
 */
class FollowingInputStream(val file: File, val waitNewInput: () => Unit) extends InputStream {
    import java.io.FileInputStream
    private val underlying = new FileInputStream(file)

    def read: Int = handle(underlying.read)

    override def read(b: Array[Byte]): Int = read(b, 0, b.length)

    override def read(b: Array[Byte], off: Int, len: Int): Int = handle(underlying.read(b, off, len))

    override def close = underlying.close

    protected def rotated_? = try {
        underlying.getChannel.position > file.length
    } catch {
        case cbie: ClosedByInterruptException =>
            println("CloseByInterrupt handled")
            Thread.currentThread().interrupt()
            false
    } finally { false }
    protected def closed_? = !underlying.getChannel.isOpen

    protected def handle(read: => Int): Int = read match {
        case -1 if rotated_? || closed_? => -1
        case -1 =>
            waitNewInput()
            handle(read)
        case i => i
    }

    require(file != null)
    assume(file.exists)
}