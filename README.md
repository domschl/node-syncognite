# node-syncognite
An event broker for neural nets

node-syncognite is a Node JS based service that gathers real-time data from home-automation (currently FHEM), and internet tickers and streams. It acts as event broker, (e.g. to send data events to neural-net models for evaluation and to allow neural models to intiate actions in the real world), and compiler of event-history-data for model training (mongodb based).

# Status
* **PRE-alpha**

## Prerequisites
### Node
```
npm install mongodb mqtt express ws node-uuid zmq lyql twitter sentiment
```
### Backends
```
mongodb mosquittto zeromq
```
