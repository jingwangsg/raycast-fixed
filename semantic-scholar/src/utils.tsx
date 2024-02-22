const os = require("os");

export function expandHomeDir(path: string) {
  if (path.startsWith("~")) {
    return path.replace("~", os.homedir());
  }
  return path;
}