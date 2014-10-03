var Sidekiq, crypto,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

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

  Sidekiq.prototype.enqueue = function(workerClass, args, payload, cb) {
    var _this = this;
    return generateJobId(function(err, jid) {
      var _ref;
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
      return (_ref = cb != null ? cb.call(_this, payload) : void 0, __indexOf.call(cb, _ref) >= 0) instanceof Function;
    });
  };

  Sidekiq.prototype.dequeue = function(payload) {
    if (payload.at != null) {
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
