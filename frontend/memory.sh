#!/bin/ash
# check free memory
echo "checked free memory sensor" 1>&2
total=$(free | awk -F' +' '/Mem/{print $3}')
/bin/containerpilot -putmetric "example_frontend_free_memory=$total"
