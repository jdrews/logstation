// Set the project name to the string 'My Project'
name := "logstation"

version := "0.1-SNAPSHOT"

scalaVersion := "2.10.4"

seq(webSettings :_*)

resolvers ++= Seq(
    "Sonatype snapshots"             at
      "http://oss.sonatype.org/content/repositories/snapshots",
    "Sonatype releases"              at
      "http://oss.sonatype.org/content/repositories/releases",
    "Java.net Maven2 Repository"     at "http://download.java.net/maven/2/"
)

resolvers += "CB Central Mirror" at "http://repo.cloudbees.com/content/groups/public"

libraryDependencies += "com.typesafe.akka" % "akka-actor_2.10" % "2.3.9"

libraryDependencies += "com.typesafe.akka" % "akka-agent_2.10" % "2.3.9"

libraryDependencies ++= {
    val liftVersion = "2.6-RC1"
    Seq(
        "net.liftweb" %% "lift-webkit" % liftVersion % "compile",
        "org.eclipse.jetty" % "jetty-webapp" % "8.1.7.v20120910"  %
          "container,test",
        "org.eclipse.jetty.orbit" % "javax.servlet" % "3.0.0.v201112011016" %
          "container,compile" artifacts Artifact("javax.servlet", "jar", "jar")
    )
}

libraryDependencies += "net.liftmodules" % "textile_2.6_2.10" % "1.3"

libraryDependencies += "org.eclipse.jetty" % "jetty-webapp" % "8.1.14.v20131031"

libraryDependencies += "org.eclipse.jetty" % "jetty-plus" % "8.1.14.v20131031"