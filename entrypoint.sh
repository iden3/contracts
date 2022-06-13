#!/bin/sh

HARDHAT_PID=$(npx hardhat --config hardhat.config.js node >/dev/1 2>&1 & echo $!)

# we should to trap signals because we run not PID 1 process.
kill_pids() {
  if [ $HARDHAT_PID -ne 0 ]; then
    kill -SIGTERM "$HARDHAT_PID"
    wait "$HARDHAT_PID"
  fi
  exit 143;
}

trap 'kill ${!}; kill_pids' SIGTERM

# deploy smart contracts to hradhat
sleep 15
npx hardhat run --network hardhat scripts/deploy.js

while true
do
  tail -f /dev/1 & wait ${!}
done
