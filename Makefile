.ONESHELL:
.PHONY: web app all

FILENAME =

ifdef OS
	# Windows (%OS% env variable only exists on Windows)
	FILENAME = logstation.exe
else
	# Unix-like OS (Linux, Mac/OSX, BSD, etc)
	FILENAME = logstation
endif

all:
	$(MAKE) web
	$(MAKE) app

app:
	go build -o ${FILENAME} ./main.go

web:
	cd web && npm run build

clean:
	cd web && npm run clean