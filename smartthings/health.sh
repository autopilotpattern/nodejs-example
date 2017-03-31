#!/bin/ash

/usr/bin/curl -o /dev/null --fail -s -H 'Content-Type: application/json' -d '{ "role": "seneca", "cmd": "stats" }' http://localhost:$PORT/act -v
