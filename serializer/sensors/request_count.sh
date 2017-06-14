#!/bin/ash

FILE=/var/log/app/requests.log
count=$(wc -l $FILE | awk '{printf $1}')
cat /dev/null > $FILE
./bin/containerpilot -putmetric "requests_per_sec=$count"
