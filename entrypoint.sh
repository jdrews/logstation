#!/bin/sh
#
# logstation entrypoint
#
# logstation expects a config file (logstation.conf) in its working directory.
# If it does not exist, the first logstation run writes a default config file
# and exits; we then start logstation a second time so the server comes up.
#
# If the user mounts their own config file, it is present on first run and we
# start the server directly.
set -e

if [ ! -f logstation.conf ]; then
    echo "[entrypoint] No logstation.conf found in the working directory."
    echo "[entrypoint] Running logstation once to generate a default config file..."
    logstation
    echo "[entrypoint] Starting logstation with the generated config file..."
else
    echo "[entrypoint] Found logstation.conf - starting logstation..."
fi

# Start the server (stays in the foreground).
exec logstation
