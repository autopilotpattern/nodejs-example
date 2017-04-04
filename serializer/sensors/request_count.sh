#!/bin/ash

FILE=/var/log/app/requests.log
count=$(wc -l $FILE | awk '{printf "\n"$1"\n"}')
cat /dev/null > $FILE
echo $count
