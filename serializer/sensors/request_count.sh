#!/bin/ash

FILE=/var/log/app/requests.log
count=$(wc -l $FILE | awk '{printf $1}')
./bin/containerpilot -putmetric "example_serializer_requests=$count"
echo $count
