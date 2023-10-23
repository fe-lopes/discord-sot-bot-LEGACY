import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

const SEA_COMMAND = {
  name: 'sea',
  description: 'Basic test command',
  type: 1,
};

const ROLE_COMMAND = {
  name: '!role',
  description: 'Role command',
  type: 1,
};

const ALL_COMMANDS = [TEST_COMMAND, SEA_COMMAND, ROLE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);