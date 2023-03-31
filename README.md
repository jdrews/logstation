# logstation #

Tails a set of log files and serves them up on a web server with syntax colors via regex. 

Binaries available in [releases](https://github.com/jdrews/logstation/releases). See [usage](https://github.com/jdrews/logstation#usage) below.

Goals:
- Run on anything and everything 
- Support as many browsers as possible
- Ease deployment and usage with a single executable with minimal configuration required

![image](https://user-images.githubusercontent.com/172766/228132770-567a2551-8d0d-43f0-b3a8-4517c141de7d.png)


Developed with Go and React 

### Usage ###
* Call `logstation` or `logstation.exe` 
   * It will create an logstation.conf in your current directory if one doesn't exist and exit
   * Update logstation.conf as desired
   * Call `logstation` or `logstation.exe` again
* Navigate to `http://127.0.0.1:8884` to start tailing (refer to [logstation.conf](logstation.default.conf) for listen IP and port)

You can also use `-c your-logstation.conf` argument to specify a config file

Take a look at [an example logstation.conf here](logstation.default.conf).

### Building ###

logstation uses [goreleaser](https://github.com/goreleaser/goreleaser) for all releases   

To build all targets locally you can run   
`goreleaser build --snapshot --clean`  
   
If you want to build for a specific target you can set environment variables   
In powershell this would look like:    
`$env:GOOS="linux"; $env:GOARCH="amd64"; goreleaser build --snapshot --clean --single-target`

Reference the [releases](https://github.com/jdrews/logstation/releases) and [.goreleaser.yaml](.goreleaser.yaml) for all officially supported targets. 

### Versions ###
Prior to 2.x, this app was built using Scala/Play/JS. At 2.x this app was rewritten in Go and React. If you're looking for the older versions reference the releases prior to 2.x. 
