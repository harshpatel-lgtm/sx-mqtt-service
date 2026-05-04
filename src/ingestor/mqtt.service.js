const mqtt = require("mqtt");
const config = require("../common/config");
const logger = require("../common/logger");
const { normalizePayload } = require("./processor");

function initMQTT(onMessage) {
  const client = mqtt.connect(config.mqtt.brokerUrl, {
    clientId: config.mqtt.clientId,
    clean: false, // Persistent session
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    logger.info(`Connected to MQTT broker at ${config.mqtt.brokerUrl}`);
    client.subscribe(config.mqtt.topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err }, `Subscription failed for topic: ${config.mqtt.topic}`);
      } else {
        logger.info(`Subscribed to topic: ${config.mqtt.topic}`);
      }
    });
  });

  client.on("message", (topic, payload) => {
    const data = normalizePayload(topic, payload);
    if (data) {
      onMessage(data);
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "MQTT client error");
  });

  client.on("reconnect", () => {
    logger.warn("MQTT client reconnecting...");
  });

  return client;
}

module.exports = {
  initMQTT
};
