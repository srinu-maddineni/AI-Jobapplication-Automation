const IORedis = require('ioredis');

let connection;

const getRedisConnection = () => {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  return connection;
};

const validateRedisConnection = async () => {
  const redis = getRedisConnection();
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }

  const pong = await redis.ping();
  const serverInfo = await redis.info('server');
  const version = serverInfo.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
  const major = Number(version.split('.')[0] || 0);

  return {
    connected: pong === 'PONG',
    supported: major >= 5,
    status: redis.status,
    version,
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    requirement: 'BullMQ requires Redis >= 5.0.0',
  };
};

const closeRedisConnection = async () => {
  if (connection && connection.status !== 'end') {
    await connection.quit();
  }
};

module.exports = {
  getRedisConnection,
  validateRedisConnection,
  closeRedisConnection,
};
