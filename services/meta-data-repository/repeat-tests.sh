set -e
for i in $(seq 1 30); do
  echo "Starting test run ${i}"
  npm test
done
