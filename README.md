# node-syncognite
An event broker for neural nets

node-syncognite is a Node JS based service that gathers real-time data from home-automation (currently FHEM), and internet tickers and streams. It acts as event broker, (e.g. to send data events to neural-net models for evaluation and to allow neural models to intiate actions in the real world), and compiler of event-history-data for model training (mongodb based).

# Status
* **PRE-alpha**
## Next steps
* encoders for sensor-values
* generalized seq2seq module for event-translation

# Prerequisites
## Node
```bash
npm install  # installs: mongodb mqtt express ws node-uuid zmq lyql twitter sentiment
```
## Backends
### Mandatory
```bash
mongodb zeromq
```
### Optional
```bash
FHEM
```
# Configuration
* Copy `node-syncognite.json.default` to `node-syncognite.json`

Edit and enable or disable sub-modules as needed. Some of the modules might require credentials, certificates or user configuration.
