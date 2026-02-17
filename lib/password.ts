import { randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*";

function randomIndex(max: number) {
  return randomInt(0, max);
}

function pick(chars: string) {
  return chars[randomIndex(chars.length)];
}

export function generateTemporaryPassword(length = 14) {
  const safeLength = Math.max(length, 12);
  const all = `${UPPERCASE}${LOWERCASE}${DIGITS}${SYMBOLS}`;

  const chars = [
    pick(UPPERCASE),
    pick(LOWERCASE),
    pick(DIGITS),
    pick(SYMBOLS),
  ];

  for (let index = chars.length; index < safeLength; index += 1) {
    chars.push(pick(all));
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    const current = chars[index];
    chars[index] = chars[swapIndex];
    chars[swapIndex] = current;
  }

  return chars.join("");
}
