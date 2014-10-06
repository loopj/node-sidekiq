var Sidekiq, crypto;

crypto = require("crypto");

Sidekiq = (function() {
  var generateJobId, getQueueName;

  generateJobId = function(cb) {
    return crypto.randomBytes(12, function(err, buf) {
      if (err != null) {
        return cb(err);
      }
      return cb(null, buf.toString("hex"));
    });
  };

  getQueueName = function(queueName) {
    return queueName || "default";
  };

  function Sidekiq(redisConnection, namespace) {
    this.redisConnection = redisConnection;
    this.namespace = namespace;
  }

  Sidekiq.prototype.namespaceKey = function(key) {
    if (this.namespace != null) {
      return "" + this.namespace + ":" + key;
    } else {
      return key;
    }
  };

  Sidekiq.prototype.getQueueKey = function(queueName) {
    return this.namespaceKey("queue:" + (getQueueName(queueName)));
  };

  Sidekiq.prototype.enqueue = function(workerClass, args, payload, cb) {
    cb || (cb = (function() {}));
    return generateJobId((function(_this) {
      return function(err, jid) {
        payload["class"] = workerClass;
        payload.args = args;
        payload.jid = jid;
        if (payload.at instanceof Date) {
          payload.at = payload.at.getTime() / 1000;
          return _this.redisConnection.zadd(_this.namespaceKey("schedule"), payload.at, JSON.stringify(payload), cb);
        } else {
          return _this.redisConnection.lpush(_this.getQueueKey(payload.queue), JSON.stringify(payload), function(err) {
            if (err) {
              return cb(err);
            } else {
              return _this.redisConnection.sadd(_this.namespaceKey("queues"), getQueueName(payload.queue), cb);
            }
          });
        }
      };
    })(this));
  };

  module.exports = Sidekiq;

  return Sidekiq;

})();
