.ONESHELL:
.PHONY: web all

all:
	$(MAKE) web
	go build -o logstation ./main.go

web:
	cd web && npm run build
	statik -src=./web/build

clean:
	cd web && npm run clean