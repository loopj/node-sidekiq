Add Jobs to Sidekiq from Node.js
================================

Installation
------------

```bash
npm install sidekiq --save
```


Usage
-----

```coffee
// Require the module
Sidekiq = require("sidekiq");

// Construct a sidekiq object with your redis connection and optional namespace
sidekiq = new Sidekiq(redisCon, process.env.NODE_ENV);

// Add a job to sidekiq
sidekiq.enqueue("WorkerClass", ["argument", "array"], {
    retry: false,
    queue: "critical"
});
```