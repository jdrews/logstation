
# ![image](https://raw.githubusercontent.com/jdrews/logstation/master/web/public/favicon-32x32.png)  logstation #

Tails a set of log files and serves them up on a web server with syntax colors via regex. 

Binaries available in [releases](https://github.com/jdrews/logstation/releases). See [usage](https://github.com/jdrews/logstation#usage) below.   
   
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) 
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=jdrews_logstation&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=jdrews_logstation)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jdrews_logstation&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=jdrews_logstation)
![Build/Test](https://github.com/jdrews/logstation/actions/workflows/build-test.yml/badge.svg)




Goals:
- Run on anything and everything 
- Support as many browsers as possible
- Ease deployment and usage with a single executable with minimal configuration required

![image](https://user-images.githubusercontent.com/172766/232646725-4943f11e-a26b-4932-a8d7-c85110cd019a.png)

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

### Releasing ### 

* Push a tag following [semver](https://semver.org/)
  * `git tag -a 2.0.0-beta1 -m "2.0.0-beta1"`
  * `git push origin 2.0.0-beta1`
* Ensure you have an environment variable with `GITHUB_TOKEN="YOUR_GH_TOKEN"` and minimum of `write:packages` permissions
* Release!   
  * `goreleaser release`
* Read the [goreleaser quickstart](https://goreleaser.com/quick-start/) for more details

### Versions ###
Prior to 2.x, this app was built using Scala/Play/JS. At 2.x this app was rewritten in Go and React. If you're looking for the older versions reference the releases prior to 2.x. 
