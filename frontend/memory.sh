#!/bin/ash
# check free memory
echo "checked free memory sensor" 1>&2
free | awk -F' +' '/Mem/{print $3}'