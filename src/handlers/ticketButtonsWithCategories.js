/**
 * Enhanced Ticket Button Handler with Per-Button Category Support
 * This module extends the ticket button functionality to support per-button categories
 */

import { getGuildConfig } from '../services/guildConfig.js';
import { createTicket } from '../services/ticket.js';
import { getButtonCategory } from '../utils/ticketPanelButtons.js';
import { logger } from '../utils/logger.js';

/**
 * Get the category ID for a specific button
 * Checks if button has its own category, otherwise uses default
 */
export async function getTicketCategoryForButton(client, guildId, buttonCustomId) {
  try {
    const config = await getGuildConfig(client, guildId);
    const buttons = config.ticketPanelButtons || [];
    
    // Find the button that was clicked
    const button = buttons.find(btn => btn.customId === buttonCustomId);
    
    if (!button) {
      logger.warn(`Button ${buttonCustomId} not found in config for guild ${guildId}`);
      return config.ticketCategoryId || null;
    }
    
    // Use button's category if set, otherwise use default
    return getButtonCategory(button, config.ticketCategoryId);
  } catch (error) {
    logger.error('Error getting ticket category for button:', error);
    return null;
  }
}

/**
 * Create ticket with button-specific category
 * This is called when a custom button is clicked
 */
export async function createTicketFromButton(interaction, client, buttonCustomId) {
  try {
    const config = await getGuildConfig(client, interaction.guildId);
    const maxTicketsPerUser = config.maxTicketsPerUser || 3;
    
    const { getUserTicketCount } = await import('../services/ticket.js');
    const currentTicketCount = await getUserTicketCount(interaction.guildId, interaction.user.id);
    
    if (currentTicketCount >= maxTicketsPerUser) {
      return {
        success: false,
        error: `You have reached the maximum number of open tickets (${maxTicketsPerUser}). Please close your existing tickets before creating a new one.`
      };
    }
    
    // Get the category for this specific button
    const categoryId = await getTicketCategoryForButton(client, interaction.guildId, buttonCustomId);
    
    // Get button info for logging
    const buttons = config.ticketPanelButtons || [];
    const button = buttons.find(btn => btn.customId === buttonCustomId);
    const buttonLabel = button?.label || 'Custom Button';
    
    // Create ticket with button-specific category
    const result = await createTicket(
      interaction.guild,
      interaction.member,
      categoryId,
      `Created via button: ${buttonLabel}`,
      'none'
    );
    
    if (result.success) {
      logger.info('Ticket created from custom button', {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        buttonCustomId: buttonCustomId,
        buttonLabel: buttonLabel,
        categoryId: categoryId,
        ticketId: result.channel.id
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Error creating ticket from button:', error);
    return {
      success: false,
      error: 'Failed to create ticket. Please try again.'
    };
  }
}

export default {
  getTicketCategoryForButton,
  createTicketFromButton
};

