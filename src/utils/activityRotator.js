import { logger } from './logger.js';

/**
 * Activity Rotator - Automatically rotates bot activities
 * Switches between multiple activities at a specified interval
 */
export class ActivityRotator {
  constructor(client, activities, intervalMinutes = 5) {
    this.client = client;
    this.activities = activities;
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.currentActivityIndex = 0;
    this.rotationTask = null;
  }

  /**
   * Start the activity rotation
   */
  start() {
    if (!this.client.isReady()) {
      logger.warn('ActivityRotator: Client not ready, waiting before starting rotation');
      setTimeout(() => this.start(), 5000);
      return;
    }

    logger.info(`ActivityRotator: Starting activity rotation (interval: ${this.intervalMs / 1000 / 60} minutes)`);
    
    // Set initial activity
    this.rotateActivity();

    // Schedule rotation
    this.rotationTask = setInterval(() => {
      this.rotateActivity();
    }, this.intervalMs);
  }

  /**
   * Rotate to the next activity
   */
  rotateActivity() {
    if (!this.client.isReady()) {
      logger.warn('ActivityRotator: Client not ready, skipping rotation');
      return;
    }

    const activity = this.activities[this.currentActivityIndex];
    
    try {
      this.client.user.setActivity(activity.name, { type: activity.type });
      logger.info(`ActivityRotator: Activity changed to "${activity.name}" (${this.getActivityTypeName(activity.type)})`);
    } catch (error) {
      logger.error('ActivityRotator: Failed to set activity:', error);
    }

    // Move to next activity
    this.currentActivityIndex = (this.currentActivityIndex + 1) % this.activities.length;
  }

  /**
   * Stop the activity rotation
   */
  stop() {
    if (this.rotationTask) {
      clearInterval(this.rotationTask);
      this.rotationTask = null;
      logger.info('ActivityRotator: Activity rotation stopped');
    }
  }

  /**
   * Get human-readable activity type name
   */
  getActivityTypeName(type) {
    const types = {
      0: 'Playing',
      1: 'Streaming',
      2: 'Listening',
      3: 'Watching',
      4: 'Custom',
      5: 'Competing'
    };
    return types[type] || 'Unknown';
  }

  /**
   * Update activities dynamically
   */
  setActivities(activities) {
    this.activities = activities;
    this.currentActivityIndex = 0;
    logger.info(`ActivityRotator: Activities updated (${activities.length} activities)`);
  }

  /**
   * Update rotation interval
   */
  setInterval(intervalMinutes) {
    this.intervalMs = intervalMinutes * 60 * 1000;
    
    // Restart rotation with new interval
    if (this.rotationTask) {
      this.stop();
      this.start();
    }
    
    logger.info(`ActivityRotator: Interval updated to ${intervalMinutes} minutes`);
  }
}

export default ActivityRotator;

