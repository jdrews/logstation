// Set the project name to the string 'My Project'
name := "logstation"
 
// The := method used in Name and Version is one of two fundamental methods.
// The other method is <<=
// All other initialization methods are implemented in terms of these.
version := "1.0"

libraryDependencies += "com.typesafe.akka" % "akka-actor_2.10" % "2.3.9"

libraryDependencies += "io.spray" % "spray-can" % "1.3.1"