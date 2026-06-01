import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    ChannelType
} from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { getGuildConfig } from '../../../services/guildConfig.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';
import {
    validateButtonConfig,
    createActionRowsFromButtons,
    sanitizeButtonConfig,
    VALID_STYLES
} from '../../../utils/ticketPanelButtons.js';

/**
 * Ticket Button Configuration Module
 * Allows admins to configure up to 5 custom buttons per ticket panel
 * Each button can have its own category
 */

export async function showButtonConfigMenu(interaction, client) {
    try {
        const config = await getGuildConfig(client, interaction.guildId);
        const buttons = config.ticketPanelButtons || [];

        const embed = createEmbed({
            title: '🎫 Ticket Panel Button Configuration',
            description: `Configure up to 5 custom buttons for your ticket panel.\\n\\n**Current Buttons:** ${buttons.length}/5`,
            color: 0x3498db,
            fields: buttons.length > 0 ? [
                {
                    name: 'Current Buttons',
                    value: buttons.map((btn, idx) => {
                        const categoryInfo = btn.categoryId ? ` (Category: <#${btn.categoryId}>)` : ' (Default Category)';
                        return `${idx + 1}. **${btn.label}** (${btn.style}) ${btn.emoji || ''}${categoryInfo}`;
                    }).join('\\n'),
                    inline: false
                }
            ] : [
                {
                    name: 'No Buttons Configured',
                    value: 'Click "Add Button" to create your first custom button.',
                    inline: false
                }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_btn_add')
                .setLabel('Add Button')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕')
                .setDisabled(buttons.length >= 5),
            new ButtonBuilder()
                .setCustomId('ticket_btn_edit')
                .setLabel('Edit Button')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️')
                .setDisabled(buttons.length === 0),
            new ButtonBuilder()
                .setCustomId('ticket_btn_delete')
                .setLabel('Delete Button')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
                .setDisabled(buttons.length === 0),
            new ButtonBuilder()
                .setCustomId('ticket_btn_preview')
                .setLabel('Preview')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👁️')
                .setDisabled(buttons.length === 0),
            new ButtonBuilder()
                .setCustomId('ticket_btn_back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
        );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [row]
        });

    } catch (error) {
        logger.error('Error showing button config menu:', error);
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [errorEmbed('Error', 'Failed to load button configuration.')]
        });
    }
}

export async function showAddButtonModal(interaction, client) {
    try {
        const config = await getGuildConfig(client, interaction.guildId);
        const guild = interaction.guild;
        
        // Get all categories in the guild
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
        const defaultCategory = config.ticketCategoryId ? 
            guild.channels.cache.get(config.ticketCategoryId)?.name : 
            'None (will create new)';
        
        const modal = new ModalBuilder()
            .setCustomId('ticket_btn_add_modal')
            .setTitle('Add Custom Button');

        const labelInput = new TextInputBuilder()
            .setCustomId('btn_label')
            .setLabel('Button Label')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "Report Bug"')
            .setMaxLength(80)
            .setRequired(true);

        const customIdInput = new TextInputBuilder()
            .setCustomId('btn_customid')
            .setLabel('Button Custom ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "report_bug" (no spaces)')
            .setMaxLength(100)
            .setRequired(true);

        const styleInput = new TextInputBuilder()
            .setCustomId('btn_style')
            .setLabel('Button Style')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('primary, secondary, success, danger')
            .setValue('primary')
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('btn_emoji')
            .setLabel('Button Emoji (optional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., "🐛"')
            .setMaxLength(10)
            .setRequired(false);

        const categoryInput = new TextInputBuilder()
            .setCustomId('btn_category')
            .setLabel('Category ID (optional, leave empty for default)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Default: ${defaultCategory}`)
            .setMaxLength(20)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(labelInput),
            new ActionRowBuilder().addComponents(customIdInput),
            new ActionRowBuilder().addComponents(styleInput),
            new ActionRowBuilder().addComponents(emojiInput),
            new ActionRowBuilder().addComponents(categoryInput)
        );

        await interaction.showModal(modal);
    } catch (error) {
        logger.error('Error showing add button modal:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to open button creation form.')],
            flags: MessageFlags.Ephemeral
        });
    }
}

export async function handleAddButtonModal(interaction, client) {
    try {
        const config = await getGuildConfig(client, interaction.guildId);
        const buttons = config.ticketPanelButtons || [];

        if (buttons.length >= 5) {
            return await interaction.reply({
                embeds: [errorEmbed('Limit Reached', 'You can only have 5 buttons per panel.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const label = interaction.fields.getTextInputValue('btn_label');
        const customId = interaction.fields.getTextInputValue('btn_customid');
        const style = interaction.fields.getTextInputValue('btn_style');
        const emoji = interaction.fields.getTextInputValue('btn_emoji') || undefined;
        const categoryId = interaction.fields.getTextInputValue('btn_category') || null;

        // Validate category if provided
        if (categoryId) {
            const category = interaction.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return await interaction.reply({
                    embeds: [errorEmbed('Invalid Category', `Category ID ${categoryId} is not a valid category in this server.`)],
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const newButton = {
            label,
            customId,
            style,
            emoji,
            categoryId: categoryId || null
        };

        const validation = validateButtonConfig(newButton);
        if (!validation.valid) {
            return await interaction.reply({
                embeds: [errorEmbed('Invalid Button', validation.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (!VALID_STYLES.includes(style)) {
            return await interaction.reply({
                embeds: [errorEmbed('Invalid Style', `Style must be one of: ${VALID_STYLES.join(', ')}`)],
                flags: MessageFlags.Ephemeral
            });
        }

        buttons.push(sanitizeButtonConfig(newButton));
        config.ticketPanelButtons = buttons;

        const { getGuildConfigKey } = await import('../../../utils/database.js');
        const configKey = getGuildConfigKey(interaction.guildId);
        await client.db.set(configKey, config);

        const categoryInfo = categoryId ? ` (Category: <#${categoryId}>)` : ' (Default Category)';
        await interaction.reply({
            embeds: [successEmbed('Button Added', `Added button: **${label}**${categoryInfo}`)],
            flags: MessageFlags.Ephemeral
        });

        logger.info('Ticket button added', {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            buttonLabel: label,
            buttonCustomId: customId,
            categoryId: categoryId,
            buttonCount: buttons.length
        });

    } catch (error) {
        logger.error('Error adding button:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to add button.')],
            flags: MessageFlags.Ephemeral
        });
    }
}

export async function showPreviewPanel(interaction, client) {
    try {
        const config = await getGuildConfig(client, interaction.guildId);
        const buttons = config.ticketPanelButtons || [];

        if (buttons.length === 0) {
            return await interaction.reply({
                embeds: [errorEmbed('No Buttons', 'No buttons configured yet.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = createEmbed({
            title: '🎫 Support Tickets (Preview)',
            description: config.ticketPanelMessage || 'Click a button below to interact.',
            color: 0x3498db,
            fields: [
                {
                    name: 'Button Categories',
                    value: buttons.map(btn => {
                        const categoryInfo = btn.categoryId ? `<#${btn.categoryId}>` : 'Default';
                        return `**${btn.label}** → ${categoryInfo}`;
                    }).join('\\n'),
                    inline: false
                }
            ]
        });

        const actionRows = createActionRowsFromButtons(buttons);

        await interaction.reply({
            embeds: [embed],
            components: actionRows,
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        logger.error('Error showing preview:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to show preview.')],
            flags: MessageFlags.Ephemeral
        });
    }
}

export default {
    showButtonConfigMenu,
    showAddButtonModal,
    handleAddButtonModal,
    showPreviewPanel
};

