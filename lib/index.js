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
      var key_added;
      payload["class"] = workerClass;
      payload.args = args;
      payload.jid = jid;
      key_added = null;
      if (payload.at instanceof Date) {
        payload.at = payload.at.getTime() / 1000;
        key_added = _this.namespaceKey("schedule");
        _this.redisConnection.zadd(key_added, payload.at, JSON.stringify(payload));
      } else {
        key_added = _this.getQueueKey(payload.queue);
        _this.redisConnection.lpush(key_added, JSON.stringify(payload));
        _this.redisConnection.sadd(_this.namespaceKey("queues"), getQueueName(payload.queue));
      }
      return callback != null ? callback.call(_this, jid, key_added) : void 0;
    });
  };

  Sidekiq.prototype.dequeue = function(jid, redis_key) {
    return console.log(jid, redis_key);
  };

  Sidekiq.prototype.cancel = Sidekiq.prototype.dequeue;

  Sidekiq.prototype.unsubscribe = Sidekiq.prototype.dequeue;

  module.exports = Sidekiq;

  return Sidekiq;

})();
