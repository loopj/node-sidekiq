crypto = require "crypto"

class Sidekiq
  generateJobId = (cb) ->
    crypto.randomBytes 12, (err, buf) ->
      return cb(err) if err?
      cb null, buf.toString("hex")

  getQueueName = (queueName) ->
    queueName or "default"

  constructor: (@redisConnection, @namespace = 'sidekiq') ->

  namespaceKey: (key) ->
    if @namespace? then "#{@namespace}:#{key}" else key

  getQueueKey: (queueName) ->
    @namespaceKey "queue:#{getQueueName(queueName)}"

  enqueue: (workerClass, args, payload, callback) ->
    generateJobId (err, jid) =>
      # Build job payload
      payload.class = workerClass
      payload.args  = args
      payload.jid   = jid
      key_added     = null

      if payload.at instanceof Date
        payload.at  = payload.at.getTime() / 1000
        key_added   = @namespaceKey("schedule")
        # Push job payload to schedule
        @redisConnection.zadd key_added, payload.at, JSON.stringify(payload)
      else
        # Push job payload to redis
        key_added = @getQueueKey(payload.queue)
        @redisConnection.lpush key_added, JSON.stringify(payload)

        # Create the queue if it doesn't already exist
        @redisConnection.sadd @namespaceKey("queues"), getQueueName(payload.queue)
      callback?.call(@, jid, key_added)

  dequeue: (jid, redis_key)->
    console.log jid, redis_key

  cancel: @::dequeue

  unsubscribe: @::dequeue

  module.exports = Sidekiq
