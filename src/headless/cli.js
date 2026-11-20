// Headless: node src/headless/cli.js --seed N --night 1 [--scenario f] [--inputs f] --ticks N --out f [--snapshot-every N]
import { main } from "./run.js";

process.exitCode = main(process.argv.slice(2));
