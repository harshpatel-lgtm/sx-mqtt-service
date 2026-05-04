require('dotenv').config();

module.exports = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    sqs: {
      dlqUrl: process.env.SQS_DLQ_URL,
    }
  },
  influx: {
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
    org: process.env.INFLUX_ORG,
    bucket: process.env.INFLUX_BUCKET,
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL,
    topic: process.env.MQTT_TOPIC || 'machines/+/telemetry',
    clientId: process.env.MQTT_CLIENT_ID || 'sx-ingestor-service',
  },
  service: {
    batchSize: parseInt(process.env.BATCH_SIZE, 10) || 100,
    batchTimeoutMs: parseInt(process.env.BATCH_TIMEOUT_MS, 10) || 5000,
    logLevel: process.env.LOG_LEVEL || 'info',
  }
};
