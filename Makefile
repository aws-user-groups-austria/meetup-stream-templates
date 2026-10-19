# The meetup evening on screen: the scenes (src/) and the run-of-show player (web-player/).
# Run `make help` for the list.

EVENT ?= 2026-10-20-aws-meetup-vienna-53
EVENTS_REPO ?= ../meetup-event-vienna

.PHONY: help install studio stills stills-sample stills-stress player player-build player-check player-event test typecheck audit check

help:
	@echo "make install        install the scenes and the web player (npm install in both)"
	@echo "make studio         Remotion Studio on the hand-written sample evening"
	@echo "make stills         one PNG per scene of $(EVENTS_REPO)/events/EVENT/event.json into out/stills/"
	@echo "make stills-sample  the same for examples/event.sample.json into out/stills-sample/"
	@echo "make stills-stress  the same for examples/event.stress.json into out/stills-stress/"
	@echo "make player         the web player dev server on http://127.0.0.1:4100/?event=$(EVENT)"
	@echo "make player-build   build the web player into web-player/dist/ (works from any path)"
	@echo "make player-check   build, serve under /present/, screenshot in headless Chrome into web-player/out/check/"
	@echo "make player-event   copy $(EVENTS_REPO)/events/EVENT/event.json and its assets/ into web-player/public/events/, write web-player/public/events/archive.json (every meetup, for the header's Our meetups and Our sponsors), and the shared people/ logos/ badges/ community/ folders into web-player/public/"
	@echo "make test           unit tests, scenes and web player"
	@echo "make typecheck      tsc for the scenes and the web player"
	@echo "make check          typecheck, unit tests and the player build"
	@echo "make audit          npm audit in both"
	@echo ""
	@echo "EVENT defaults to $(EVENT)."

install:
	npm install
	cd web-player && npm install

studio:
	npm run studio

EVENT_FILE = $(EVENTS_REPO)/events/$(EVENT)/event.json

stills:
	@test -f "$(EVENT_FILE)" || { echo "No $(EVENT_FILE) (run make sync EVENT=$(EVENT) in $(EVENTS_REPO) first, or make stills-sample)"; exit 1; }
	node scripts/stills.mjs --event "$(EVENT_FILE)" --out out/stills

stills-sample:
	node scripts/stills.mjs --out out/stills-sample

stills-stress:
	node scripts/stills.mjs --event examples/event.stress.json --out out/stills-stress

player:
	@echo "Open http://127.0.0.1:4100/?event=$(EVENT)"
	cd web-player && npm run dev

player-build:
	cd web-player && npm run build

player-check:
	cd web-player && npm run check:screens

player-event:
	@test -n "$(EVENT)" || { echo "usage: make player-event EVENT=<id>"; exit 2; }
	@test -f "$(EVENT_FILE)" || { echo "No $(EVENT_FILE) (run make sync EVENT=$(EVENT) there first)"; exit 1; }
	cp "$(EVENT_FILE)" "web-player/public/events/$(EVENT).json"
	@echo "web-player/public/events/$(EVENT).json updated"
	rm -rf "web-player/public/events/$(EVENT)"
	@if [ -d "$(EVENTS_REPO)/events/$(EVENT)/assets" ]; then \
	  mkdir -p "web-player/public/events/$(EVENT)" && \
	  cp -R "$(EVENTS_REPO)/events/$(EVENT)/assets" "web-player/public/events/$(EVENT)/assets" && \
	  echo "web-player/public/events/$(EVENT)/assets/ updated"; \
	fi
	node scripts/archive-index.mjs --events "$(EVENTS_REPO)" --out web-player/public/events/archive.json
	rm -rf web-player/public/people web-player/public/logos web-player/public/badges web-player/public/community
	@for shared in people logos badges community; do \
	  if [ -d "$(EVENTS_REPO)/$$shared" ]; then \
	    cp -R "$(EVENTS_REPO)/$$shared" "web-player/public/$$shared" && \
	    echo "web-player/public/$$shared/ updated"; \
	  fi; \
	done

test:
	npm test
	cd web-player && npm test

typecheck:
	npm run typecheck
	cd web-player && npm run typecheck

audit:
	npm audit
	cd web-player && npm audit

check: typecheck test player-build
