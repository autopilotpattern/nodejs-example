#!/bin/ash

FILE=/var/log/app/requests.log
count=$(wc -l $FILE | awk '{printf $1}')
truncate -s 0 $FILE
./bin/containerpilot -putmetric "example_serializer_requests=$count"
