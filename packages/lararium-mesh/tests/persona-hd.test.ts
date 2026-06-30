/**
 * persona-hd — SLIP-0010 ed25519 hardened HD derivation, witnessed against the
 * OFFICIAL spec test vectors.
 *
 * Source of vectors (verbatim hex):
 *   https://github.com/satoshilabs/slips/blob/master/slip-0010.md
 *   (raw: https://raw.githubusercontent.com/satoshilabs/slips/master/slip-0010.md)
 *   "Test vector 1 for ed25519" + "Test vector 2 for ed25519".
 *
 * The spec prints the public key as `00 || ed25519_pubkey` (33 bytes). The repo's
 * verifyingKey convention stores the BARE 32-byte ed25519 public key (no 00
 * prefix), so each expected public key below is checked both ways: the full
 * `pub` field (with 00) drives the chain-code/key assertions, and the derived
 * verifyingKey is asserted == pub.slice(2) (the 00 dropped).
 */

import { describe, test, expect } from "vitest";
import {
  masterKeyFromSeed,
  deriveHardenedChild,
  derivePersonaKeypair,
  HARDENED_OFFSET,
} from "../src/persona-hd.js";
import { hex, hexToBytes } from "../src/crypto.js";

interface Vector {
  path: number[]; // RAW indices (hardening applied internally)
  chain: string;
  priv: string;
  pub: string; // 00-prefixed, exactly as the spec prints it
}

// --- Test vector 1 (seed 000102030405060708090a0b0c0d0e0f) -----------------
const SEED_1 = "000102030405060708090a0b0c0d0e0f";
const VECTORS_1: Vector[] = [
  {
    path: [],
    chain: "90046a93de5380a72b5e45010748567d5ea02bbf6522f979e05c0d8d8ca9fffb",
    priv:  "2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7",
    pub:   "00a4b2856bfec510abab89753fac1ac0e1112364e7d250545963f135f2a33188ed",
  },
  {
    path: [0], // m/0H
    chain: "8b59aa11380b624e81507a27fedda59fea6d0b779a778918a2fd3590e16e9c69",
    priv:  "68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3",
    pub:   "008c8a13df77a28f3445213a0f432fde644acaa215fc72dcdf300d5efaa85d350c",
  },
  {
    path: [0, 1], // m/0H/1H
    chain: "a320425f77d1b5c2505a6b1b27382b37368ee640e3557c315416801243552f14",
    priv:  "b1d0bad404bf35da785a64ca1ac54b2617211d2777696fbffaf208f746ae84f2",
    pub:   "001932a5270f335bed617d5b935c80aedb1a35bd9fc1e31acafd5372c30f5c1187",
  },
  {
    path: [0, 1, 2], // m/0H/1H/2H
    chain: "2e69929e00b5ab250f49c3fb1c12f252de4fed2c1db88387094a0f8c4c9ccd6c",
    priv:  "92a5b23c0b8a99e37d07df3fb9966917f5d06e02ddbd909c7e184371463e9fc9",
    pub:   "00ae98736566d30ed0e9d2f4486a64bc95740d89c7db33f52121f8ea8f76ff0fc1",
  },
  {
    path: [0, 1, 2, 2], // m/0H/1H/2H/2H
    chain: "8f6d87f93d750e0efccda017d662a1b31a266e4a6f5993b15f5c1f07f74dd5cc",
    priv:  "30d1dc7e5fc04c31219ab25a27ae00b50f6fd66622f6e9c913253d6511d1e662",
    pub:   "008abae2d66361c879b900d204ad2cc4984fa2aa344dd7ddc46007329ac76c429c",
  },
  {
    path: [0, 1, 2, 2, 1000000000], // m/0H/1H/2H/2H/1000000000H
    chain: "68789923a0cac2cd5a29172a475fe9e0fb14cd6adb5ad98a3fa70333e7afa230",
    priv:  "8f94d394a8e8fd6b1bc2f3f49f5c47e385281d5c17e65324b0f62483e37e8793",
    pub:   "003c24da049451555d51a7014a37337aa4e12d41e485abccfa46b47dfb2af54b7a",
  },
];

// --- Test vector 2 (longer seed) -------------------------------------------
const SEED_2 =
  "fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29" +
  "f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542";
const VECTORS_2: Vector[] = [
  {
    path: [],
    chain: "ef70a74db9c3a5af931b5fe73ed8e1a53464133654fd55e7a66f8570b8e33c3b",
    priv:  "171cb88b1b3c1db25add599712e36245d75bc65a1a5c9e18d76f9f2b1eab4012",
    pub:   "008fe9693f8fa62a4305a140b9764c5ee01e455963744fe18204b4fb948249308a",
  },
  {
    path: [0], // m/0H
    chain: "0b78a3226f915c082bf118f83618a618ab6dec793752624cbeb622acb562862d",
    priv:  "1559eb2bbec5790b0c65d8693e4d0875b1747f4970ae8b650486ed7470845635",
    pub:   "0086fab68dcb57aa196c77c5f264f215a112c22a912c10d123b0d03c3c28ef1037",
  },
  {
    path: [0, 2147483647], // m/0H/2147483647H
    chain: "138f0b2551bcafeca6ff2aa88ba8ed0ed8de070841f0c4ef0165df8181eaad7f",
    priv:  "ea4f5bfe8694d8bb74b7b59404632fd5968b774ed545e810de9c32a4fb4192f4",
    pub:   "005ba3b9ac6e90e83effcd25ac4e58a1365a9e35a3d3ae5eb07b9e4d90bcf7506d",
  },
  {
    path: [0, 2147483647, 1], // m/0H/2147483647H/1H
    chain: "73bd9fff1cfbde33a1b846c27085f711c0fe2d66fd32e139d3ebc28e5a4a6b90",
    priv:  "3757c7577170179c7868353ada796c839135b3d30554bbb74a4b1e4a5a58505c",
    pub:   "002e66aa57069c86cc18249aecf5cb5a9cebbfd6fadeab056254763874a9352b45",
  },
  {
    path: [0, 2147483647, 1, 2147483646], // m/0H/2147483647H/1H/2147483646H
    chain: "0902fe8a29f9140480a00ef244bd183e8a13288e4412d8389d140aac1794825a",
    priv:  "5837736c89570de861ebc173b1086da4f505d4adb387c6a1b1342d5e4ac9ec72",
    pub:   "00e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b",
  },
  {
    path: [0, 2147483647, 1, 2147483646, 2], // m/0H/2147483647H/1H/2147483646H/2H
    chain: "5d70af781f3a37b829f0d060924d5e960bdc02e85423494afc0b1a41bbe196d4",
    priv:  "551d333177df541ad876a60ea71f00447931c0a9da16f227c11ea080d7391b8d",
    pub:   "0047150c75db263559a70d5778bf36abbab30fb061ad69f69ece61a72b0cfa4fc0",
  },
];

/** Walk the all-hardened path manually via master + child, returning the node. */
function walk(seedHex: string, path: number[]) {
  let node = masterKeyFromSeed(hexToBytes(seedHex));
  for (const i of path) node = deriveHardenedChild(node.key, node.chainCode, i);
  return node;
}

function runVectorSuite(name: string, seedHex: string, vectors: Vector[]) {
  describe(name, () => {
    for (const v of vectors) {
      const label = v.path.length === 0 ? "m" : "m/" + v.path.map((i) => `${i}H`).join("/");

      test(`${label} — chain code + private key (manual master/child walk)`, () => {
        const node = walk(seedHex, v.path);
        expect(hex(node.chainCode)).toBe(v.chain);
        expect(hex(node.key)).toBe(v.priv);
      });

      test(`${label} — derivePersonaKeypair signingKey + verifyingKey (00-stripped pub)`, async () => {
        const kp = await derivePersonaKeypair(hexToBytes(seedHex), v.path);
        // signingKey = IL (the spec private key).
        expect(kp.signingKey).toBe(v.priv);
        // verifyingKey = spec public key WITHOUT the 00 prefix (repo convention).
        expect(v.pub.slice(0, 2)).toBe("00");
        expect(kp.verifyingKey).toBe(v.pub.slice(2));
      });
    }
  });
}

runVectorSuite("SLIP-0010 ed25519 — Test Vector 1", SEED_1, VECTORS_1);
runVectorSuite("SLIP-0010 ed25519 — Test Vector 2", SEED_2, VECTORS_2);

describe("persona-hd — guards", () => {
  test("HARDENED_OFFSET is 0x80000000", () => {
    expect(HARDENED_OFFSET).toBe(0x80000000);
  });

  test("deriveHardenedChild rejects an already-hardened index (no double-harden)", () => {
    const m = masterKeyFromSeed(hexToBytes(SEED_1));
    expect(() => deriveHardenedChild(m.key, m.chainCode, 0x80000000)).toThrow(/RAW index/);
  });

  test("deriveHardenedChild rejects a negative / non-integer index", () => {
    const m = masterKeyFromSeed(hexToBytes(SEED_1));
    expect(() => deriveHardenedChild(m.key, m.chainCode, -1)).toThrow(/non-negative/);
    expect(() => deriveHardenedChild(m.key, m.chainCode, 1.5)).toThrow(/non-negative/);
  });

  test("deriveHardenedChild rejects a parent key of the wrong length", () => {
    const m = masterKeyFromSeed(hexToBytes(SEED_1));
    expect(() => deriveHardenedChild(new Uint8Array(16), m.chainCode, 0)).toThrow(/32 bytes/);
  });
});
