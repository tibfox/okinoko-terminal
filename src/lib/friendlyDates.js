import { format , register} from 'timeago.js'

register('en_short', (number, index) => {
  // Same index mapping as built-in locales
  return [
    ['just now', 'right now'],
    ['%ss ago', 'in %ss'],
    ['1m ago', 'in 1m'],
    ['%sm ago', 'in %sm'],
    ['1h ago', 'in 1h'],
    ['%sh ago', 'in %sh'],
    ['1d ago', 'in 1d'],
    ['%sd ago', 'in %sd'],
    ['1w ago', 'in 1w'],
    ['%sw ago', 'in %sw'],
    ['1mo ago', 'in 1mo'],
    ['%smo ago', 'in %smo'],
    ['1y ago', 'in 1y'],
    ['%sy ago', 'in %sy'],
  ][index];
});

export function formatUTC(str) {
  const formatString = str.endsWith('Z') ? str : str + 'Z';
  return format(new Date(formatString),'en_short');
}
