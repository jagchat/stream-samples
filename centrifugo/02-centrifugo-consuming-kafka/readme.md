- start docker compose
- wait for 15 seconds (to get services up and running)
- open terminal for `centrigugo-consumer`

```
python -m http.server 3000
```

- open http://localhost:3000/ in browser
- enter into "nodejs" container

```
npm install
node kafka-producer --once
node kafka-producer
```

- The browser should receive events pushed by kafka-producer
