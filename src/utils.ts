import { readFile } from 'fs/promises';
import { userInfo } from 'os';
import * as path from 'path';
import * as SSHConfig from 'ssh-config';

export async function hostToHostName(host: string): Promise<string> {
  const sshConfigPath = path.join(userInfo().homedir, '.ssh', 'config');
  const rawSSHConfig = (await readFile(sshConfigPath)).toString();
  const { HostName: hostName } = SSHConfig.parse(rawSSHConfig).compute(host);
  return hostName;
}
