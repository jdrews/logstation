#!/bin/sh
#
# logstation entrypoint
#
# logstation expects a config file (logstation.conf) in its working directory.
# If it does not exist, logstation writes out a default config file and exits.
# So on first run we invoke logstation once to generate the default config, then
# invoke it again so the server actually starts.
#
# If the user mounts their own config file, it is present on first run and we
# start the server directly.
set -e

# First run: if there is no config file, generate the default one (this exits).
if [ ! -f logstation.conf ]; then
    logstation
fi

# Second run: start the server with the config file.
exec logstation
