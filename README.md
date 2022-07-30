# logstation #

**Note:** This branch is a rewrite of logstation in Go and React. Lots of work to do here but stay tuned!

Tails a set of log files and serves them up on a web server with syntax colors via regex. 

Binaries available in [releases](https://github.com/jdrews/logstation/releases). See [usage](https://github.com/jdrews/logstation#usage) below.

Focus on:
- Support for both Windows and Linux
- Support as many browsers as possible
- Ease deployment and usage with a single executable with minimal configuration required

![image](https://user-images.githubusercontent.com/172766/42130891-cc14e292-7cc0-11e8-8db6-5f136254172b.png)

Developed with Go and React 

### Usage ###
* Call `logstation` or `logstation.exe` 
* It will create an logstation.conf in your current directory and exit
* Update logstation.conf 
* Call `logstation` or `logstation.exe` again to start it
* Navigate to `http://127.0.0.1:8884` to start tailing

Can also use `-c your-logstation.conf` argument

Take a look at [an example logstation.conf here](logstation.default.conf).

### Building ###

Refer to the [Makefile](Makefile) for build details.   
In general, run `make all` to build a `logstation` executable. 
