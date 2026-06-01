import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from './logger.js';

/**
 * Ticket Panel Button Manager
 * Manages custom buttons for ticket panels with per-button category support
 */

const BUTTON_STYLES = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};

const VALID_STYLES = Object.keys(BUTTON_STYLES);

/**
 * Validate button configuration
 */
export function validateButtonConfig(button) {
  if (!button) return { valid: false, error: 'Button config is required' };
  
  if (!button.label || typeof button.label !== 'string') {
    return { valid: false, error: 'Button label is required and must be a string' };
  }
  
  if (button.label.length > 80) {
    return { valid: false, error: 'Button label must be 80 characters or less' };
  }
  
  if (!button.customId || typeof button.customId !== 'string') {
    return { valid: false, error: 'Button customId is required and must be a string' };
  }
  
  if (button.customId.length > 100) {
    return { valid: false, error: 'Button customId must be 100 characters or less' };
  }
  
  if (!button.style || !VALID_STYLES.includes(button.style)) {
    return { valid: false, error: `Button style must be one of: ${VALID_STYLES.join(', ')}` };
  }
  
  if (button.emoji && typeof button.emoji !== 'string') {
    return { valid: false, error: 'Button emoji must be a string' };
  }
  
  return { valid: true };
}

/**
 * Create button from config
 */
export function createButtonFromConfig(buttonConfig) {
  const validation = validateButtonConfig(buttonConfig);
  if (!validation.valid) {
    logger.warn('Invalid button config:', validation.error);
    return null;
  }
  
  const button = new ButtonBuilder()
    .setCustomId(buttonConfig.customId)
    .setLabel(buttonConfig.label)
    .setStyle(BUTTON_STYLES[buttonConfig.style]);
  
  if (buttonConfig.emoji) {
    button.setEmoji(buttonConfig.emoji);
  }
  
  if (buttonConfig.url) {
    button.setURL(buttonConfig.url);
  }
  
  if (buttonConfig.disabled) {
    button.setDisabled(true);
  }
  
  return button;
}

/**
 * Create action rows from button configs
 * Discord limits 5 buttons per row, max 5 rows
 */
export function createActionRowsFromButtons(buttonConfigs) {
  if (!Array.isArray(buttonConfigs) || buttonConfigs.length === 0) {
    return [];
  }
  
  const validButtons = [];
  
  for (const config of buttonConfigs) {
    const button = createButtonFromConfig(config);
    if (button) {
      validButtons.push(button);
    }
  }
  
  if (validButtons.length === 0) {
    return [];
  }
  
  // Create action rows (max 5 buttons per row)
  const actionRows = [];
  for (let i = 0; i < validButtons.length; i += 5) {
    const rowButtons = validButtons.slice(i, i + 5);
    const row = new ActionRowBuilder().addComponents(rowButtons);
    actionRows.push(row);
  }
  
  return actionRows;
}

/**
 * Get default ticket buttons
 */
export function getDefaultTicketButtons() {
  return [
    {
      label: 'Create Ticket',
      customId: 'create_ticket',
      style: 'primary',
      emoji: '📩',
      categoryId: null // Will use default category
    }
  ];
}

/**
 * Get default ticket management buttons (for inside ticket channel)
 */
export function getDefaultTicketManagementButtons() {
  return [
    {
      label: 'Close Ticket',
      customId: 'ticket_close',
      style: 'danger',
      emoji: '🔒'
    },
    {
      label: 'Claim',
      customId: 'ticket_claim',
      style: 'primary',
      emoji: '🙋'
    },
    {
      label: 'Pin',
      customId: 'ticket_pin',
      style: 'secondary',
      emoji: '📌'
    }
  ];
}

/**
 * Sanitize button config for storage
 */
export function sanitizeButtonConfig(button) {
  return {
    label: String(button.label || '').substring(0, 80),
    customId: String(button.customId || '').substring(0, 100),
    style: VALID_STYLES.includes(button.style) ? button.style : 'primary',
    emoji: button.emoji ? String(button.emoji).substring(0, 10) : undefined,
    url: button.url ? String(button.url).substring(0, 2000) : undefined,
    disabled: Boolean(button.disabled),
    categoryId: button.categoryId ? String(button.categoryId) : null // Per-button category
  };
}

/**
 * Get category for button (per-button or fallback to default)
 */
export function getButtonCategory(button, defaultCategoryId) {
  // If button has its own category, use it
  if (button.categoryId) {
    return button.categoryId;
  }
  // Otherwise use default
  return defaultCategoryId || null;
}

export default {
  validateButtonConfig,
  createButtonFromConfig,
  createActionRowsFromButtons,
  getDefaultTicketButtons,
  getDefaultTicketManagementButtons,
  sanitizeButtonConfig,
  getButtonCategory,
  BUTTON_STYLES,
  VALID_STYLES
};

