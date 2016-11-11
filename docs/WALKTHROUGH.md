# Gitter-Webapp Walkthrough

## Introduction

`gitter-webapp` is the main monolith for `https://gitter.im` (the Gitter web app), `https://api.gitter.im` (the Gitter API) and `https://ws.gitter.im` (The Gitter realtime socket streaming service).

## Entry Points

There are three server processes:
* [`api.js`](../api.js): serving the API
* [`web.js`](../web.js): serving the web 
* [`websockets.js`](../websockets.js): websocket process

## A Bit of History

This repository started as a large monolith and for the most part still is a monolith. Now we are starting to transition to a [monorepo structure](https://lernajs.io/) and over time, more and more functionality will be moved out of the main monolith, into smaller modules.

These modules will initially be kept in the same repo as the monolith, but since they're fairly independent, can move out of the main repo into their own repos as team organization requirements evolve over time.



## Structure

* [`build-scripts/`](../build-scripts): Tools and scripts related to building the application
* [`config/`](../config): Configuration files
* [`modules/`](../modules#modules): Monorepo style submodules
* [`public/`](../public): Public assets for https://gitter.im
* [`redis-lua/`](../redis-lua): Lua scripts for Redis
* [`server/`](../server#server): https://gitter.im backend
* [`shared/`](../shared): Isomorphic Javascript shared by frontend and backend.

## Diagrams

### Overview

![](./images/overview.jpg)

### Architecture

![](./images/architecture.jpg)
