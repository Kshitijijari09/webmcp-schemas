#!/usr/bin/env node
import { runCli } from './cli-run.js';

const result = await runCli(process.argv.slice(2));
console.log(result.output);
process.exit(result.exitCode);
