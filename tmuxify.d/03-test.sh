#!/bin/bash
while true; do
    npm run autotest
    inotifywait -e MODIFY src test
done
