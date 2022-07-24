.ONESHELL:
.PHONY: web app all

all:
	$(MAKE) web
	$(MAKE) app

app:
	go build -o logstation ./main.go

web:
	cd web && npm run build

clean:
	cd web && npm run clean