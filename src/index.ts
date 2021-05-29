#! /usr/bin/env node

import * as chalk from 'chalk';
import * as chokidar from 'chokidar';
import { program } from 'commander';
import { debounce } from 'debounce';
import * as execa from 'execa';
import * as net from 'net';
import * as path from 'path';
import * as process from 'process';
import * as WebSocket from 'ws';

import { version } from '../package.json';
import { hostToHostName } from './utils';

program.version(version, '-v, --version');

program
  .command('watch <path> <host>')
  .description('watches the specified files and runs them on the host')
  .action(async (relativePath: string, host: string) => {
    const fullPath = path.join(process.cwd(), relativePath, '/');
    const hostName = await hostToHostName(host);

    const ws = new WebSocket(`ws://${hostName}:1001`);

    ws.on('open', () => {
      chokidar.watch(fullPath).on(
        'all',
        debounce(async () => {
          console.log(chalk`{italic.yellow Files changed}`);
          console.log(chalk`{blue Syncing files...}`);
          try {
            await execa('rsync', [
              '-avzhe',
              'ssh',
              fullPath,
              `${host}:/rg-dev`,
            ]);
            console.log(chalk`{green Files synced}`);
            console.log(chalk`{blue Reloading...}`);
            ws.send(JSON.stringify({ event: 'reload' }));
          } catch (error) {
            console.log(chalk`{bold.red An unexpected error occured}`);
            console.error(error);
          }
        }, 500)
      );
    });

    ws.on('message', (rawData) => {
      const data = JSON.parse(rawData.toString());

      switch (data.event) {
        case 'reloaded': {
          console.log(chalk`{green Reloaded}`);
          break;
        }
      }
    });
  });

program
  .command('shell <host>')
  .description('opens a node repl on the host')
  .action(async (host: string) => {
    const hostName = await hostToHostName(host);
    const socket = net.connect({ host: hostName, port: 5001 });
    process.stdin.pipe(socket);
    socket.pipe(process.stdout);
  });

program.parse(process.argv);
