const config = require("../common/config");
const logger = require("../common/logger");
const { initMQTT } = require("./mqtt.service");
const IngestionBuffer = require("./buffer");
const { writeToTimestream } = require("./storage.service");

logger.info("Starting SX MQTT Ingestion Service...");

// Initialize Ingestion Buffer
const buffer = new IngestionBuffer(
  config.service.batchSize,
  config.service.batchTimeoutMs,
  async (batch) => {
    try {
      // await writeToTimestream(batch);
      logger.info(`[SAFE MODE] Would have written ${batch.length} records to Timestream:`);
      console.log(JSON.stringify(batch, null, 2));
    } catch (err) {
      // In a more complex setup, we could implement local disk spillover here
      logger.error("Failed to process batch, records might be lost if DLQ failed.");
    }
  }
);

// Initialize MQTT
const mqttClient = initMQTT((data) => {
  buffer.add(data);
});

// Graceful Shutdown
function shutdown() {
  logger.info("Shutting down gracefully...");
  mqttClient.end();
  buffer.flush().then(() => {
    logger.info("Buffer flushed. Exit.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info(`Service initialized. Batch Size: ${config.service.batchSize}, Timeout: ${config.service.batchTimeoutMs}ms`);
