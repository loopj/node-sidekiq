crypto = require "crypto"

class Sidekiq
  generateJobId = (cb) ->
    crypto.randomBytes 12, (err, buf) ->
      return cb(err) if err?
      cb null, buf.toString("hex")

  constructor: (@redisConnection, @namespace) ->

  namespaceKey: (key) ->
    if @namespace? then "#{@namespace}:#{key}" else key

  getQueueName: (queueName) ->
    queueName or "default"

  getQueueKey: (queueName) ->
    @namespaceKey "queue:#{@getQueueName(queueName)}"

  enqueue: (workerClass, args, opts) ->
    generateJobId (err, jid) =>
      # Build job payload
      opts.class = workerClass
      opts.args = args
      opts.jid = jid

      # Push job payload to redis
      @redisConnection.lpush @getQueueKey(opts.queue), JSON.stringify(opts)

      # Create the queue if it doesn't already exist
      @redisConnection.sadd @namespaceKey("queues"), @getQueueName(opts.queue)

  module.exports = Sidekiq