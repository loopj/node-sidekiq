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
    this.namespace = namespace != null ? namespace : 'sidekiq';
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

  Sidekiq.prototype.enqueue = function(workerClass, args, payload, callback) {
    var _this = this;
    return generateJobId(function(err, jid) {
      payload["class"] = workerClass;
      payload.args = args;
      payload.jid = jid;
      if (payload.at instanceof Date) {
        payload.at = payload.at.getTime() / 1000;
        _this.redisConnection.zadd(_this.namespaceKey("schedule"), payload.at, JSON.stringify(payload));
      } else {
        _this.redisConnection.lpush(_this.getQueueKey(payload.queue), JSON.stringify(payload));
        _this.redisConnection.sadd(_this.namespaceKey("queues"), getQueueName(payload.queue));
      }
      return callback != null ? callback.call(_this, payload) : void 0;
    });
  };

  Sidekiq.prototype.dequeue = function(payload) {
    if (payload.at instanceof Date) {
      this.redisConnection.zrem(this.namespaceKey("schedule"), JSON.stringify(payload));
    } else {
      this.redisConnection.lrem(this.getQueueKey(payload.queue), 0, JSON.stringify(payload));
    }
    return payload.jid;
  };

  Sidekiq.prototype.cancel = Sidekiq.prototype.dequeue;

  Sidekiq.prototype.unsubscribe = Sidekiq.prototype.dequeue;

  module.exports = Sidekiq;

  return Sidekiq;

})();
