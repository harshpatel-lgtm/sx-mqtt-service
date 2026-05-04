const logger = require("../common/logger");

/**
 * Parses the MQTT topic to extract machine_id if not present in payload.
 * Expected topic: machines/{factory_id}/{machine_id}/telemetry
 */
function parseTopic(topic) {
  const parts = topic.split('/');
  if (parts.length >= 3) {
    return {
      factory_id: parts[1],
      machine_id: parts[2]
    };
  }
  return {};
}

/**
 * Normalizes the incoming payload, ensuring all required fields are present.
 */
function normalizePayload(topic, payload) {
  let data;
  try {
    data = JSON.parse(payload.toString());
  } catch (err) {
    logger.error({ topic, payload: payload.toString() }, 'Malformed JSON payload');
    return null;
  }

  const topicMeta = parseTopic(topic);
  
  // Merge topic metadata with payload data
  const normalized = {
    ...topicMeta,
    ...data,
    // Ensure timestamp exists, fallback to now
    timestamp: data.timestamp || new Date().toISOString()
  };

  return normalized;
}

module.exports = {
  normalizePayload
};
