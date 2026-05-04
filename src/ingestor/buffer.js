const logger = require("../common/logger");

class IngestionBuffer {
  constructor(maxSize, maxWaitMs, onFlush) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.maxWaitMs = maxWaitMs;
    this.onFlush = onFlush;
    this.timer = null;
  }

  add(record) {
    this.buffer.push(record);
    
    // If buffer reaches maxSize, flush immediately
    if (this.buffer.length >= this.maxSize) {
      logger.debug(`Buffer full (${this.buffer.length}), flushing...`);
      this.flush();
    } 
    // Otherwise, start a timer to flush if it hasn't been flushed recently
    else if (!this.timer) {
      this.timer = setTimeout(() => {
        logger.debug(`Buffer timeout reached (${this.buffer.length} records), flushing...`);
        this.flush();
      }, this.maxWaitMs);
    }
  }

  async flush() {
    if (this.buffer.length === 0) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const dataToFlush = [...this.buffer];
    this.buffer = [];

    try {
      await this.onFlush(dataToFlush);
    } catch (err) {
      logger.error({ err }, 'Failed to flush ingestion buffer');
      // In a real production system, you might want to re-add to buffer
      // or send to a fallback storage if the error is persistent.
    }
  }
}

module.exports = IngestionBuffer;
