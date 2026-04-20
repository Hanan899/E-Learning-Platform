#!/bin/bash
set -e

echo "--- Creating data and upload directories ---"
mkdir -p /home/data
mkdir -p /home/uploads

echo "--- Syncing database ---"
node src/utils/syncDb.js

echo "--- Running seeder ---"
node src/utils/seeder.js

echo "--- Starting server ---"
node src/server.js