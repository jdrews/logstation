package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

var lipsumwords = []string{"a", "ac", "accumsan", "ad", "adipiscing", "aenean", "aliquam", "aliquet",
	"amet", "ante", "aptent", "arcu", "at", "auctor", "augue", "bibendum",
	"blandit", "class", "commodo", "condimentum", "congue", "consectetur",
	"consequat", "conubia", "convallis", "cras", "cubilia", "cum", "curabitur",
	"curae", "cursus", "dapibus", "diam", "dictum", "dictumst", "dignissim",
	"dis", "dolor", "donec", "dui", "duis", "egestas", "eget", "eleifend",
	"elementum", "elit", "enim", "erat", "eros", "est", "et", "etiam", "eu",
	"euismod", "facilisi", "facilisis", "fames", "faucibus", "felis",
	"fermentum", "feugiat", "fringilla", "fusce", "gravida", "habitant",
	"habitasse", "hac", "hendrerit", "himenaeos", "iaculis", "id", "imperdiet",
	"in", "inceptos", "integer", "interdum", "ipsum", "justo", "lacinia",
	"lacus", "laoreet", "lectus", "leo", "libero", "ligula", "litora",
	"lobortis", "lorem", "luctus", "maecenas", "magna", "magnis", "malesuada",
	"massa", "mattis", "mauris", "metus", "mi", "molestie", "mollis", "montes",
	"morbi", "mus", "nam", "nascetur", "natoque", "nec", "neque", "netus",
	"nibh", "nisi", "nisl", "non", "nostra", "nulla", "nullam", "nunc", "odio",
	"orci", "ornare", "parturient", "pellentesque", "penatibus", "per",
	"pharetra", "phasellus", "placerat", "platea", "porta", "porttitor",
	"posuere", "potenti", "praesent", "pretium", "primis", "proin", "pulvinar",
	"purus", "quam", "quis", "quisque", "rhoncus", "ridiculus", "risus",
	"rutrum", "sagittis", "sapien", "scelerisque", "sed", "sem", "semper",
	"senectus", "sit", "sociis", "sociosqu", "sodales", "sollicitudin",
	"suscipit", "suspendisse", "taciti", "tellus", "tempor", "tempus",
	"tincidunt", "torquent", "tortor", "tristique", "turpis", "ullamcorper",
	"ultrices", "ultricies", "urna", "ut", "varius", "vehicula", "vel", "velit",
	"venenatis", "vestibulum", "vitae", "vivamus", "viverra", "volutpat",
	"vulputate"}

var punctuation = []string{".", "?", "!"}
var severity = []string{"ERROR", "WARN", "INFO", "DEBUG", "TRACE", ""}

func main() {
	logPtr := flag.String("logfile", "test/logfile.log", "Name of logfile that receives the generated log lines")
	intervalPtr := flag.Int("interval", 1000, "Log line generation interval in milliseconds")
	prependLognamePtr := flag.Bool("prependlogname", false, "Prepend the name of the logfile to the loglines")
	flag.Parse()
	prependStr := ""
	if *prependLognamePtr {
		prependStr = *logPtr
	}

	// Prepare file
	rand.Seed(time.Now().Unix())
	file, err := os.OpenFile(*logPtr, os.O_CREATE|os.O_WRONLY, 0644)

	if err != nil {
		log.Fatalf("failed creating file: %s", err)
		os.Exit(1)
	}

	c := make(chan os.Signal)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		fmt.Println("\rCtrl+C pressed in Terminal, closing file...")
		file.Close()
		fmt.Println("\rGoodbye!")
		os.Exit(0)
	}()

	file.Close()

	// Begin opening file, write line, flush, and close file.
	i := 0
	for {
		file, err := os.OpenFile(*logPtr, os.O_APPEND, 0644)

		if err != nil {
			log.Fatalf("failed opening file: %s", err)
			os.Exit(1)
		}
		datawriter := bufio.NewWriter(file)
		datawriter.WriteString(fmt.Sprint(i, ": ", prependStr, " (", time.Now().Format(time.RFC3339), ") [", randomSeverity(), "] ", paragraph(), ">>STOP\n"))
		datawriter.Flush()
		file.Close()
		time.Sleep(time.Duration(*intervalPtr) * time.Millisecond)
		i++
	}
}

func randomSeverity() string {
	return severity[rand.Intn(len(severity))]
}

func randomWord() string {
	return lipsumwords[rand.Intn(len(lipsumwords))]
}

func randomPunctuation() string {
	return punctuation[rand.Intn(len(punctuation))]
}

func words(count int) string {
	if count > 0 {
		return strings.TrimSpace(randomWord() + " " + words(count-1))
	} else {
		return ""
	}
}

func sentenceFragment() string {
	return words(rand.Intn(10) + 3)
}

func sentence() string {
	s := strings.Title(randomWord()) + " "
	if rand.Intn(2) == 0 {
		for i := 0; i < rand.Intn(3); i++ {
			s += sentenceFragment() + ", "
		}
	}
	return sentenceFragment() + randomPunctuation()
}

func sentences(count int) string {
	if count > 0 {
		return sentence() + " " + strings.TrimSpace(sentences(count-1))
	} else {
		return ""
	}
}

func paragraph() string {
	return sentences(rand.Intn(10) + 2)
}
