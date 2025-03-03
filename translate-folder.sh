#!/bin/bash

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Create the logs directory if it doesn't exist
mkdir -p logs

# Set the log file path with a timestamp
LOG_FILE="logs/translate-folder-$(date +"%Y-%m-%d_%H-%M-%S").log"

# Execute the command while saving the output to the log file
npm run translate-folder "$@" 2>&1 | tee "$LOG_FILE"
