const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqsClient } = require("../common/aws.client");
const config = require("../common/config");
const logger = require("../common/logger");

const influxDB = new InfluxDB({ url: config.influx.url, token: config.influx.token });
// Create a SINGLE global writeApi instance
const writeApi = influxDB.getWriteApi(config.influx.org, config.influx.bucket, 'ns');

async function writeToInflux(batch) {
  if (!batch || batch.length === 0) return;

  let recordsWritten = 0;

  try {
    for (const msg of batch) {
      if (!msg.machine_id) {
        logger.warn(msg, 'Incomplete record skipped: Missing machine_id');
        continue;
      }

      const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();

      const point = new Point('cnc_telemetry')
        .tag('machine_id', String(msg.machine_id))
        .tag('factory_id', String(msg.factory_id || 'UNKNOWN'))
        .timestamp(timestamp);

      if (msg.spindle_speed !== undefined) point.floatField('spindle_speed', parseFloat(msg.spindle_speed));
      if (msg.feed_rate !== undefined) point.floatField('feed_rate', parseFloat(msg.feed_rate));
      if (msg.axis_x !== undefined) point.floatField('axis_x', parseFloat(msg.axis_x));
      if (msg.axis_y !== undefined) point.floatField('axis_y', parseFloat(msg.axis_y));
      if (msg.axis_z !== undefined) point.floatField('axis_z', parseFloat(msg.axis_z));
      if (msg.production_count !== undefined) point.floatField('production_count', parseFloat(msg.production_count));
      if (msg.cycle_time !== undefined) point.floatField('cycle_time', parseFloat(msg.cycle_time));

      writeApi.writePoint(point);
      recordsWritten++;
    }

    // Use flush() to send data, DO NOT close() here
    await writeApi.flush();
    logger.info(`Successfully flushed ${recordsWritten} records to InfluxDB`);
  } catch (err) {
    logger.error({ err }, 'Error writing to InfluxDB');
    
    // Fallback to SQS DLQ for manual inspection/retry
    if (config.aws.sqs.dlqUrl) {
      await sendToDLQ(batch, err.message);
    }
    
    throw err; // Propagate for buffer handling
  }
}

async function sendToDLQ(batch, reason) {
  try {
    const command = new SendMessageCommand({
      QueueUrl: config.aws.sqs.dlqUrl,
      MessageBody: JSON.stringify({ batch, error: reason, timestamp: new Date().toISOString() })
    });
    await sqsClient.send(command);
    logger.info('Sent failed batch to DLQ');
  } catch (dlqErr) {
    logger.error({ dlqErr }, 'Critical: Failed to send to DLQ');
  }
}

async function closeInflux() {
  try {
    logger.info("Closing InfluxDB writeApi...");
    await writeApi.close(); // Flushes remaining data and closes
    logger.info("InfluxDB writeApi closed successfully.");
  } catch (err) {
    logger.error({ err }, "Error closing InfluxDB writeApi");
  }
}

module.exports = {
  writeToInflux,
  closeInflux
};
