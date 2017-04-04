#!/bin/ash

FILE=/var/log/app/requests.log
count=$(wc -l $FILE | awk '{printf $1}')
cat /dev/null > $FILE
echo $count
