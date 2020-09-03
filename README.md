# node-syncognite

An event broker for neural nets

node-syncognite is a Node JS based service that gathers real-time data from home-automation (currently FHEM), and internet tickers and streams. It acts as event broker, (e.g. to send data events to neural-net models for evaluation and to allow neural models to intiate actions in the real world), and compiler of event-history-data for model training (mongodb based).

## Status

* **PRE-alpha**

## History

* 0.1.3: (2019-05-14) Security update, mqtt-packet updated, all dependencies updated.
* 0.1.2: (2018-01-11) Security update, cryptiles dependency removed, all dependencies updated.
* 0.1.1: Security update for hoek<5.0.3, all dependent modules updated, fixes for breakages in zmq -> zeromq, mongodb -> 3.x, new version of sentiment.

## Next steps

* encoders for sensor-values
* generalized seq2seq module for event-translation

## Prerequisites

### Node

```bash
npm install  # installs: mongodb mqtt express ws uuid zeromq lyql twitter sentiment
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

## Configuration

* Copy `node-syncognite.json.default` to `node-syncognite.json`

Edit and enable or disable sub-modules as needed. Some of the modules might require credentials, certificates or user configuration.

* Create a folder `Certs` and fill in public and private certificates for secure communcation. The names must match the names in `node-syncognite.json`, defaults are `Certs/node-syncognite-key.pem`, `./Certs/node-syncognite-pub.pem`. 

**Dependencies:** `openssl`, available certificate authority (CA) key. See for example [here](https://gist.github.com/fntlnz/cf14feb5a46b2eda428e000157447309) on how to create a root CA with openssl.

You can create a pair of certificates by copying:

```bash
cp gen-cert.py.default gen-cert.py
```

Then fill in valid data in `gen-cert.py` and execute from `Certs` directory and update cert names in node-syncognite.json.
