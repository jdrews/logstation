name := "logstation"

version := "0.3.3"

scalaVersion := "2.10.4"

organization := "com.jdrews.logstation"

assemblyJarName in assembly := s"${name.value}-${version.value}.jar"

mainClass in assembly := Some("com.jdrews.logstation.LogStation")

assemblyMergeStrategy in assembly := {
    case PathList("javax", "mail", xs @ _*)         => MergeStrategy.first
    case "plugin.properties"                            => MergeStrategy.concat
    case x =>
        val oldStrategy = (assemblyMergeStrategy in assembly).value
        oldStrategy(x)
}

seq(webSettings :_*)

resolvers ++= Seq(
    "Java.net Maven2 Repository"     at "http://download.java.net/maven/2/"
)

resolvers ++= Seq("snapshots"     at "https://oss.sonatype.org/content/repositories/snapshots",
    "releases"        at "https://oss.sonatype.org/content/repositories/releases"
)

libraryDependencies += "com.typesafe.akka" % "akka-actor_2.10" % "2.3.9"

libraryDependencies += "com.typesafe.akka" % "akka-agent_2.10" % "2.3.9"

libraryDependencies ++= {
    val liftVersion = "2.6.3"
    Seq(
        "net.liftweb"       %% "lift-webkit"        % liftVersion        % "compile",
        "net.liftmodules"   %% "lift-jquery-module_2.6" % "2.9",
        "org.eclipse.jetty" % "jetty-webapp"        % "8.1.7.v20120910"  % "compile,container,test",
        "org.eclipse.jetty" % "jetty-plus"          % "8.1.7.v20120910"  % "container,test", // For Jetty Config
        "org.eclipse.jetty.orbit" % "javax.servlet" % "3.0.0.v201112011016" % "container,test" artifacts Artifact("javax.servlet", "jar", "jar"),
        "ch.qos.logback"    % "logback-classic"     % "1.0.6",
        "org.specs2"        %% "specs2"             % "2.3.12"           % "test"
    )
}

libraryDependencies += "com.typesafe" % "config" % "1.2.1"

libraryDependencies += "com.google.guava" % "guava" % "16.0.1"


