package main

import (
	"testing"
	"time"

	"github.com/cskr/pubsub"
)

// TestPubSubBlockingPubWedgesOnUndrainedSubscriber documents the line-skip
// mechanism behind issue #110 ("Lines are getting skipped when reading
// multiple lines within the same millisecond") as it existed in the
// pre-fix stack:
//
// logstation used to run a single pubsub broker (pubsub.New(1) in main)
// with one subscriber per websocket client (WebSocketHandler), and
// Follow published with the BLOCKING Pub. The broker fans each published
// line out with blocking channel sends to every subscriber. If one
// client's connection went half-dead, the write in WebSocketHandler
// failed, the handler broke out of its loop, and its subscription channel
// was left un-drained. The next line published to that full queue wedged
// the single broker goroutine forever: every line published afterwards
// was lost for EVERY other client, and the dead client's Unsub could not
// save it because that command queued up behind the wedged publish.
//
// The e2e burst test (test/e2e/specs/issue-110-burst.spec.js) observed
// this in a real browser: the page's websocket stayed connected, but the
// log stream froze mid-burst after one of the other e2e clients'
// connections died.
//
// This test models that with an undrained subscriber and asserts,
// deterministically, that a healthy subscriber stops receiving lines.
// The app no longer uses this configuration: see
// TestPubSubTryPubSurvivesUndrainedSubscriber for the fixed behavior.
func TestPubSubBlockingPubWedgesOnUndrainedSubscriber(t *testing.T) {
	// The old (broken) broker configuration
	pubSub := pubsub.New(1)

	// The "dead" client: a websocket handler whose connection went half-dead.
	// It stops draining its subscription channel, exactly like
	// WebSocketHandler does after a failed write.
	dead := pubSub.Sub("lines")
	_ = dead // never drained from here on

	// A healthy client: another browser, subscribed before the wedge.
	healthy := pubSub.Sub("lines")

	// Line 1 fans out to both subscribers' capacity-1 queues without
	// blocking: the broker completes and goes idle.
	pubSub.Pub(LogMessage{Text: "line 1"}, "lines")

	// Line 2 wedges the broker: its fan-out must push into the dead
	// subscriber's full queue, which nobody drains, so the single broker
	// goroutine blocks there forever. Pub is synchronous up to the broker
	// accepting the command, so once it returns the broker is committed to
	// the wedging fan-out and every command published after this point is
	// guaranteed to queue behind it.
	pubSub.Pub(LogMessage{Text: "line 2"}, "lines")

	// The dead client's handler gives up and unsubscribes. It cannot help:
	// the Unsub command is queued behind the wedged publish, never processed.
	go pubSub.Unsub(dead, "lines")

	// Drain whatever reached the healthy client before the wedge (line 1,
	// and line 2 depending on the broker's fan-out order).
	drainDeadline := time.After(500 * time.Millisecond)
	for {
		select {
		case <-healthy:
			continue
		case <-drainDeadline:
			goto wedged
		}
	}
wedged:

	// Line 3 is published after the wedge. If the broker were alive, the
	// healthy client would receive it. It never does: lines are skipped for
	// every remaining client, exactly the issue #110 symptom.
	go pubSub.Pub(LogMessage{Text: "line 3"}, "lines")
	select {
	case msg := <-healthy:
		t.Fatalf("broker should be wedged on the undrained subscriber, but the healthy client received %v", msg)
	case <-time.After(500 * time.Millisecond):
		// expected: line 3 was lost for the healthy client
	}
}

// TestPubSubTryPubSurvivesUndrainedSubscriber proves the fixed broker
// configuration used by the app (pubsub.New(pubSubQueueSize) in main +
// TryPub in Follow) cannot wedge: an undrained (dead) subscriber fills its
// own queue and drops lines for ITSELF only, while a healthy subscriber
// keeps receiving every line. This is the issue #110 fix at the broker
// level; the WebSocketHandler changes (read pump, write deadline, pings)
// ensure dead subscribers are unsubscribed promptly so their queues stop
// absorbing lines at all.
func TestPubSubTryPubSurvivesUndrainedSubscriber(t *testing.T) {
	// Same broker configuration as main()
	pubSub := pubsub.New(pubSubQueueSize)

	// The dead client: stops draining its subscription channel, exactly
	// like a websocket handler whose connection went half-dead.
	dead := pubSub.Sub("lines")
	_ = dead // never drained from here on

	// A healthy client, draining as it goes.
	healthy := pubSub.Sub("lines")

	// Publish more lines than the dead subscriber's queue can hold. With
	// the non-blocking TryPub the broker never stalls: the dead subscriber
	// keeps its first pubSubQueueSize lines and drops the rest, while the
	// healthy subscriber must receive every single one.
	total := pubSubQueueSize * 2
	for i := 0; i < total; i++ {
		pubSub.TryPub(LogMessage{Text: "line"}, "lines")
		if i%100 == 0 {
			// Let the healthy subscriber drain so its queue (same size as
			// the dead one's) has room; the dead one never drains.
			drain(healthy, 100)
		}
	}
	// Drain everything the healthy subscriber has queued.
	drain(healthy, pubSubQueueSize)

	// The broker is alive: one more line reaches the healthy subscriber.
	pubSub.TryPub(LogMessage{Text: "final"}, "lines")
	select {
	case <-healthy:
		// expected
	case <-time.After(time.Second):
		t.Fatal("broker should survive an undrained subscriber, but the healthy client stopped receiving lines")
	}
}

// drain removes up to n messages from ch, ignoring anything that arrives
// later.
func drain(ch chan interface{}, n int) {
	for i := 0; i < n; i++ {
		select {
		case <-ch:
		case <-time.After(50 * time.Millisecond):
			return
		}
	}
}
