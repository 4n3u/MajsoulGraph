const DIGIT = "0".charCodeAt(0);
const ALPHA = "a".charCodeAt(0);

const OFFSET = 10_000_000;
const XOR_CODE = 6_139_246;
const OFFSET_2_A = 1_117_113;
const OFFSET_2_B = 1_358_437;
const XOR_CODE_2 = 86_216_345;

function mod36(value: number): number {
  return ((value % 36) + 36) % 36;
}

function shiftUuid(uuid: string, transform: (value: number, index: number) => number): string {
  const result: string[] = [];

  for (let index = 0; index < uuid.length; index += 1) {
    const char = uuid[index]!;
    let value: number | undefined;

    if (char >= "0" && char <= "9") {
      value = char.charCodeAt(0) - DIGIT;
    } else if (char >= "a" && char <= "z") {
      value = char.charCodeAt(0) - ALPHA + 10;
    }

    if (value === undefined) {
      result.push(char);
      continue;
    }

    const shifted = mod36(transform(value, index));
    result.push(shifted < 10 ? String.fromCharCode(shifted + DIGIT) : String.fromCharCode(shifted + ALPHA - 10));
  }

  return result.join("");
}

export function encodePaipuUuid(uuid: string): string {
  return shiftUuid(uuid, (value, index) => value + 17 + index);
}

export function decodePaipuUuid(uuid: string): string {
  return shiftUuid(uuid, (value, index) => value + 55 - index);
}

export function acc2Friend(accountId: number): number {
  const data = accountId ^ XOR_CODE;
  const tmp = data & 67_108_863;
  const rotated = ((tmp & 524_287) << 7) | (tmp >> 19);
  return Math.trunc(rotated + (data & 67_108_864) + OFFSET);
}

export function acc2Match(accountId: number): number {
  return Math.trunc(((7 * accountId + OFFSET_2_A) ^ XOR_CODE_2) + OFFSET_2_B);
}

export function mat2Account(matchId: number): number {
  return Math.trunc((((matchId - OFFSET_2_B) ^ XOR_CODE_2) - OFFSET_2_A) / 7);
}

export function mat2Friend(matchId: number): number {
  return acc2Friend(mat2Account(matchId));
}

export function zone(accountId: number): "CN" | "JP" | "EN" | "unknown" {
  const region = (accountId >> 23) & 0xf;
  if (region >= 0 && region <= 6) return "CN";
  if (region >= 7 && region <= 12) return "JP";
  if (region >= 13 && region <= 15) return "EN";
  return "unknown";
}
