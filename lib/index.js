var Sidekiq, crypto;

crypto = require("crypto");

Sidekiq = (function() {
  var generateJobId;

  generateJobId = function(cb) {
    return crypto.randomBytes(12, function(err, buf) {
      if (err != null) {
        return cb(err);
      }
      return cb(null, buf.toString("hex"));
    });
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

  Sidekiq.prototype.getQueueName = function(queueName) {
    return queueName || "default";
  };

  Sidekiq.prototype.getQueueKey = function(queueName) {
    return this.namespaceKey("queue:" + (this.getQueueName(queueName)));
  };

  Sidekiq.prototype.enqueue = function(workerClass, args, opts) {
    var _this = this;
    return generateJobId(function(err, jid) {
      opts["class"] = workerClass;
      opts.args = args;
      opts.jid = jid;
      _this.redisConnection.lpush(_this.getQueueKey(opts.queue), JSON.stringify(opts));
      return _this.redisConnection.sadd(_this.namespaceKey("queues"), _this.getQueueName(opts.queue));
    });
  };

  module.exports = Sidekiq;

  return Sidekiq;

})();
