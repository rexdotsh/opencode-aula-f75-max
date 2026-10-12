import { png } from 'aula-f75-max-screen';
import { LOOKS } from '../src/look';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: bun run preview <file.png>');
  process.exit(1);
}
await Bun.write(file, png(Object.values(LOOKS).flatMap(({ screen }) => screen.entries.map(({ pixels }) => pixels))));
console.error(`wrote ${file}: ${Object.keys(LOOKS).join(', ')}`);
