import { Telegraf } from 'telegraf';
import { config, hasBotToken } from '../config/default.js';

export const bot = hasBotToken() ? new Telegraf(config.bot.token) : null;
