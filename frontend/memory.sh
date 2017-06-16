#!/bin/ash
# check free memory
total=$(free | awk -F' +' '/Mem/{print $3}')
/bin/containerpilot -putmetric "example_frontend_free_memory=$total"
