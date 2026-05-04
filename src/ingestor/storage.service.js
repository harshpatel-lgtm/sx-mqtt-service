const { WriteRecordsCommand } = require("@aws-sdk/client-timestream-write");
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { timestreamClient, sqsClient } = require("../common/aws.client");
const config = require("../common/config");
const logger = require("../common/logger");

async function writeToTimestream(batch) {
  if (!batch || batch.length === 0) return;

  const records = batch.map(msg => {
    // Basic validation: ensure we have machine_id and timestamp
    if (!msg.machine_id || !msg.timestamp) {
      logger.warn(msg, 'Incomplete record skipped');
      return null;
    }

    return {
      Dimensions: [
        { Name: 'machine_id', Value: String(msg.machine_id) },
        { Name: 'program_name', Value: String(msg.program_name || 'UNKNOWN') },
        { Name: 'tool_name', Value: String(msg.tool_name || 'UNKNOWN') },
        { Name: 'machine_state', Value: String(msg.machine_state || '0') }
      ],
      MeasureName: 'cnc_telemetry',
      MeasureValueType: 'MULTI',
      MeasureValues: [
        { Name: 'spindle_speed', Value: String(msg.spindle_speed || 0), Type: 'DOUBLE' },
        { Name: 'spindle_override', Value: String(msg.spindle_override || 0), Type: 'DOUBLE' },
        { Name: 'feed_rate', Value: String(msg.feed_rate || 0), Type: 'DOUBLE' },
        { Name: 'feed_override', Value: String(msg.feed_override || 0), Type: 'DOUBLE' },
        { Name: 'tool_number', Value: String(msg.tool_number || 0), Type: 'DOUBLE' },
        { Name: 'cutting_time', Value: String(msg.cutting_time || 0), Type: 'DOUBLE' },
        { Name: 'program_runtime', Value: String(msg.program_runtime || 0), Type: 'DOUBLE' },
        { Name: 'axis_x', Value: String(msg.axis_x || 0), Type: 'DOUBLE' },
        { Name: 'axis_y', Value: String(msg.axis_y || 0), Type: 'DOUBLE' },
        { Name: 'axis_z', Value: String(msg.axis_z || 0), Type: 'DOUBLE' },
        { Name: 'spindle_load', Value: String(msg.spindle_load || 0), Type: 'DOUBLE' },
        { Name: 'production_count', Value: String(msg.production_count || 0), Type: 'DOUBLE' },
        { Name: 'production_time', Value: String(msg.production_time || 0), Type: 'DOUBLE' },
        { Name: 'cycle_time', Value: String(msg.cycle_time || 0), Type: 'DOUBLE' },
        { Name: 'alarm_active', Value: String(msg.alarm_active || 0), Type: 'DOUBLE' }
      ],
      Time: new Date(msg.timestamp).getTime().toString()
    };
  }).filter(r => r !== null);

  if (records.length === 0) return;

  const command = new WriteRecordsCommand({
    DatabaseName: config.aws.timestream.database,
    TableName: config.aws.timestream.table,
    Records: records
  });

  try {
    await timestreamClient.send(command);
    logger.info(`Successfully wrote ${records.length} records to Timestream`);
  } catch (err) {
    logger.error({ err }, 'Error writing to Timestream');
    
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

module.exports = {
  writeToTimestream
};
