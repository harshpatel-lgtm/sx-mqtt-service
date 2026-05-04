const { TimestreamWriteClient } = require("@aws-sdk/client-timestream-write");
const { SQSClient } = require("@aws-sdk/client-sqs");
const config = require("./config");

const timestreamClient = new TimestreamWriteClient({ 
  region: config.aws.region 
});

const sqsClient = new SQSClient({ 
  region: config.aws.region 
});

module.exports = {
  timestreamClient,
  sqsClient
};
