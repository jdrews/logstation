package com.jdrews.logstation.utils

/**
 * Created by jdrews on 3/29/2015.
 *
 * Maintain a list of fixed size. i.e. drop old entries if list reaches $max
 */
import scala.collection._
import mutable.ListBuffer

// store only $max number of elements in list
class FixedList[A](max: Int) extends Traversable[A] {

    val list: ListBuffer[A] = ListBuffer()

    def append(elem: A) {
        if (list.size == max) {
            list.trimStart(1)
        }
        list.append(elem)
    }

    def foreach[U](f: A => U) = list.foreach(f)

}