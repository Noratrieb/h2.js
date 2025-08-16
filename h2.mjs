import * as net from "node:net";
import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import path from "node:path";
import * as stream from "node:stream";

const debug = process.env.DEBUG?.includes("h2.js");

const buildHuffmanTree = (values) => {
  const root = [];
  for (const [value, path] of values) {
    let cur = root;
    for (let i = 0; i < path.length; i++) {
      const decision = Number(path[i]);

      if (i === path.length - 1) {
        cur[decision] = value;
      } else {
        if (!cur[decision]) {
          cur[decision] = [];
        }
      }

      cur = cur[decision];
    }
  }

  return root;
};

const HUFFMAN_EOS = Symbol("EOS");
const HUFFMAN_TREE = buildHuffmanTree([
  [String.fromCharCode(0), "1111111111000"],
  [String.fromCharCode(1), "11111111111111111011000"],
  [String.fromCharCode(2), "1111111111111111111111100010"],
  [String.fromCharCode(3), "1111111111111111111111100011"],
  [String.fromCharCode(4), "1111111111111111111111100100"],
  [String.fromCharCode(5), "1111111111111111111111100101"],
  [String.fromCharCode(6), "1111111111111111111111100110"],
  [String.fromCharCode(7), "1111111111111111111111100111"],
  [String.fromCharCode(8), "1111111111111111111111101000"],
  [String.fromCharCode(9), "111111111111111111101010"],
  [String.fromCharCode(10), "111111111111111111111111111100"],
  [String.fromCharCode(11), "1111111111111111111111101001"],
  [String.fromCharCode(12), "1111111111111111111111101010"],
  [String.fromCharCode(13), "111111111111111111111111111101"],
  [String.fromCharCode(14), "1111111111111111111111101011"],
  [String.fromCharCode(15), "1111111111111111111111101100"],
  [String.fromCharCode(16), "1111111111111111111111101101"],
  [String.fromCharCode(17), "1111111111111111111111101110"],
  [String.fromCharCode(18), "1111111111111111111111101111"],
  [String.fromCharCode(19), "1111111111111111111111110000"],
  [String.fromCharCode(20), "1111111111111111111111110001"],
  [String.fromCharCode(21), "1111111111111111111111110010"],
  [String.fromCharCode(22), "111111111111111111111111111110"],
  [String.fromCharCode(23), "1111111111111111111111110011"],
  [String.fromCharCode(24), "1111111111111111111111110100"],
  [String.fromCharCode(25), "1111111111111111111111110101"],
  [String.fromCharCode(26), "1111111111111111111111110110"],
  [String.fromCharCode(27), "1111111111111111111111110111"],
  [String.fromCharCode(28), "1111111111111111111111111000"],
  [String.fromCharCode(29), "1111111111111111111111111001"],
  [String.fromCharCode(30), "1111111111111111111111111010"],
  [String.fromCharCode(31), "1111111111111111111111111011"],
  [String.fromCharCode(32), "010100"],
  [String.fromCharCode(33), "1111111000"],
  [String.fromCharCode(34), "1111111001"],
  [String.fromCharCode(35), "111111111010"],
  [String.fromCharCode(36), "1111111111001"],
  [String.fromCharCode(37), "010101"],
  [String.fromCharCode(38), "11111000"],
  [String.fromCharCode(39), "11111111010"],
  [String.fromCharCode(40), "1111111010"],
  [String.fromCharCode(41), "1111111011"],
  [String.fromCharCode(42), "11111001"],
  [String.fromCharCode(43), "11111111011"],
  [String.fromCharCode(44), "11111010"],
  [String.fromCharCode(45), "010110"],
  [String.fromCharCode(46), "010111"],
  [String.fromCharCode(47), "011000"],
  [String.fromCharCode(48), "00000"],
  [String.fromCharCode(49), "00001"],
  [String.fromCharCode(50), "00010"],
  [String.fromCharCode(51), "011001"],
  [String.fromCharCode(52), "011010"],
  [String.fromCharCode(53), "011011"],
  [String.fromCharCode(54), "011100"],
  [String.fromCharCode(55), "011101"],
  [String.fromCharCode(56), "011110"],
  [String.fromCharCode(57), "011111"],
  [String.fromCharCode(58), "1011100"],
  [String.fromCharCode(59), "11111011"],
  [String.fromCharCode(60), "111111111111100"],
  [String.fromCharCode(61), "100000"],
  [String.fromCharCode(62), "111111111011"],
  [String.fromCharCode(63), "1111111100"],
  [String.fromCharCode(64), "1111111111010"],
  [String.fromCharCode(65), "100001"],
  [String.fromCharCode(66), "1011101"],
  [String.fromCharCode(67), "1011110"],
  [String.fromCharCode(68), "1011111"],
  [String.fromCharCode(69), "1100000"],
  [String.fromCharCode(70), "1100001"],
  [String.fromCharCode(71), "1100010"],
  [String.fromCharCode(72), "1100011"],
  [String.fromCharCode(73), "1100100"],
  [String.fromCharCode(74), "1100101"],
  [String.fromCharCode(75), "1100110"],
  [String.fromCharCode(76), "1100111"],
  [String.fromCharCode(77), "1101000"],
  [String.fromCharCode(78), "1101001"],
  [String.fromCharCode(79), "1101010"],
  [String.fromCharCode(80), "1101011"],
  [String.fromCharCode(81), "1101100"],
  [String.fromCharCode(82), "1101101"],
  [String.fromCharCode(83), "1101110"],
  [String.fromCharCode(84), "1101111"],
  [String.fromCharCode(85), "1110000"],
  [String.fromCharCode(86), "1110001"],
  [String.fromCharCode(87), "1110010"],
  [String.fromCharCode(88), "11111100"],
  [String.fromCharCode(89), "1110011"],
  [String.fromCharCode(90), "11111101"],
  [String.fromCharCode(91), "1111111111011"],
  [String.fromCharCode(92), "1111111111111110000"],
  [String.fromCharCode(93), "1111111111100"],
  [String.fromCharCode(94), "11111111111100"],
  [String.fromCharCode(95), "100010"],
  [String.fromCharCode(96), "111111111111101"],
  [String.fromCharCode(97), "00011"],
  [String.fromCharCode(98), "100011"],
  [String.fromCharCode(99), "00100"],
  [String.fromCharCode(100), "100100"],
  [String.fromCharCode(101), "00101"],
  [String.fromCharCode(102), "100101"],
  [String.fromCharCode(103), "100110"],
  [String.fromCharCode(104), "100111"],
  [String.fromCharCode(105), "00110"],
  [String.fromCharCode(106), "1110100"],
  [String.fromCharCode(107), "1110101"],
  [String.fromCharCode(108), "101000"],
  [String.fromCharCode(109), "101001"],
  [String.fromCharCode(110), "101010"],
  [String.fromCharCode(111), "00111"],
  [String.fromCharCode(112), "101011"],
  [String.fromCharCode(113), "1110110"],
  [String.fromCharCode(114), "101100"],
  [String.fromCharCode(115), "01000"],
  [String.fromCharCode(116), "01001"],
  [String.fromCharCode(117), "101101"],
  [String.fromCharCode(118), "1110111"],
  [String.fromCharCode(119), "1111000"],
  [String.fromCharCode(120), "1111001"],
  [String.fromCharCode(121), "1111010"],
  [String.fromCharCode(122), "1111011"],
  [String.fromCharCode(123), "111111111111110"],
  [String.fromCharCode(124), "11111111100"],
  [String.fromCharCode(125), "11111111111101"],
  [String.fromCharCode(126), "1111111111101"],
  [String.fromCharCode(127), "1111111111111111111111111100"],
  [String.fromCharCode(128), "11111111111111100110"],
  [String.fromCharCode(129), "1111111111111111010010"],
  [String.fromCharCode(130), "11111111111111100111"],
  [String.fromCharCode(131), "11111111111111101000"],
  [String.fromCharCode(132), "1111111111111111010011"],
  [String.fromCharCode(133), "1111111111111111010100"],
  [String.fromCharCode(134), "1111111111111111010101"],
  [String.fromCharCode(135), "11111111111111111011001"],
  [String.fromCharCode(136), "1111111111111111010110"],
  [String.fromCharCode(137), "11111111111111111011010"],
  [String.fromCharCode(138), "11111111111111111011011"],
  [String.fromCharCode(139), "11111111111111111011100"],
  [String.fromCharCode(140), "11111111111111111011101"],
  [String.fromCharCode(141), "11111111111111111011110"],
  [String.fromCharCode(142), "111111111111111111101011"],
  [String.fromCharCode(143), "11111111111111111011111"],
  [String.fromCharCode(144), "111111111111111111101100"],
  [String.fromCharCode(145), "111111111111111111101101"],
  [String.fromCharCode(146), "1111111111111111010111"],
  [String.fromCharCode(147), "11111111111111111100000"],
  [String.fromCharCode(148), "111111111111111111101110"],
  [String.fromCharCode(149), "11111111111111111100001"],
  [String.fromCharCode(150), "11111111111111111100010"],
  [String.fromCharCode(151), "11111111111111111100011"],
  [String.fromCharCode(152), "11111111111111111100100"],
  [String.fromCharCode(153), "111111111111111011100"],
  [String.fromCharCode(154), "1111111111111111011000"],
  [String.fromCharCode(155), "11111111111111111100101"],
  [String.fromCharCode(156), "1111111111111111011001"],
  [String.fromCharCode(157), "11111111111111111100110"],
  [String.fromCharCode(158), "11111111111111111100111"],
  [String.fromCharCode(159), "111111111111111111101111"],
  [String.fromCharCode(160), "1111111111111111011010"],
  [String.fromCharCode(161), "111111111111111011101"],
  [String.fromCharCode(162), "11111111111111101001"],
  [String.fromCharCode(163), "1111111111111111011011"],
  [String.fromCharCode(164), "1111111111111111011100"],
  [String.fromCharCode(165), "11111111111111111101000"],
  [String.fromCharCode(166), "11111111111111111101001"],
  [String.fromCharCode(167), "111111111111111011110"],
  [String.fromCharCode(168), "11111111111111111101010"],
  [String.fromCharCode(169), "1111111111111111011101"],
  [String.fromCharCode(170), "1111111111111111011110"],
  [String.fromCharCode(171), "111111111111111111110000"],
  [String.fromCharCode(172), "111111111111111011111"],
  [String.fromCharCode(173), "1111111111111111011111"],
  [String.fromCharCode(174), "11111111111111111101011"],
  [String.fromCharCode(175), "11111111111111111101100"],
  [String.fromCharCode(176), "111111111111111100000"],
  [String.fromCharCode(177), "111111111111111100001"],
  [String.fromCharCode(178), "1111111111111111100000"],
  [String.fromCharCode(179), "111111111111111100010"],
  [String.fromCharCode(180), "11111111111111111101101"],
  [String.fromCharCode(181), "1111111111111111100001"],
  [String.fromCharCode(182), "11111111111111111101110"],
  [String.fromCharCode(183), "11111111111111111101111"],
  [String.fromCharCode(184), "11111111111111101010"],
  [String.fromCharCode(185), "1111111111111111100010"],
  [String.fromCharCode(186), "1111111111111111100011"],
  [String.fromCharCode(187), "1111111111111111100100"],
  [String.fromCharCode(188), "11111111111111111110000"],
  [String.fromCharCode(189), "1111111111111111100101"],
  [String.fromCharCode(190), "1111111111111111100110"],
  [String.fromCharCode(191), "11111111111111111110001"],
  [String.fromCharCode(192), "11111111111111111111100000"],
  [String.fromCharCode(193), "11111111111111111111100001"],
  [String.fromCharCode(194), "11111111111111101011"],
  [String.fromCharCode(195), "1111111111111110001"],
  [String.fromCharCode(196), "1111111111111111100111"],
  [String.fromCharCode(197), "11111111111111111110010"],
  [String.fromCharCode(198), "1111111111111111101000"],
  [String.fromCharCode(199), "1111111111111111111101100"],
  [String.fromCharCode(200), "11111111111111111111100010"],
  [String.fromCharCode(201), "11111111111111111111100011"],
  [String.fromCharCode(202), "11111111111111111111100100"],
  [String.fromCharCode(203), "111111111111111111111011110"],
  [String.fromCharCode(204), "111111111111111111111011111"],
  [String.fromCharCode(205), "11111111111111111111100101"],
  [String.fromCharCode(206), "111111111111111111110001"],
  [String.fromCharCode(207), "1111111111111111111101101"],
  [String.fromCharCode(208), "1111111111111110010"],
  [String.fromCharCode(209), "111111111111111100011"],
  [String.fromCharCode(210), "11111111111111111111100110"],
  [String.fromCharCode(211), "111111111111111111111100000"],
  [String.fromCharCode(212), "111111111111111111111100001"],
  [String.fromCharCode(213), "11111111111111111111100111"],
  [String.fromCharCode(214), "111111111111111111111100010"],
  [String.fromCharCode(215), "111111111111111111110010"],
  [String.fromCharCode(216), "111111111111111100100"],
  [String.fromCharCode(217), "111111111111111100101"],
  [String.fromCharCode(218), "11111111111111111111101000"],
  [String.fromCharCode(219), "11111111111111111111101001"],
  [String.fromCharCode(220), "1111111111111111111111111101"],
  [String.fromCharCode(221), "111111111111111111111100011"],
  [String.fromCharCode(222), "111111111111111111111100100"],
  [String.fromCharCode(223), "111111111111111111111100101"],
  [String.fromCharCode(224), "11111111111111101100"],
  [String.fromCharCode(225), "111111111111111111110011"],
  [String.fromCharCode(226), "11111111111111101101"],
  [String.fromCharCode(227), "111111111111111100110"],
  [String.fromCharCode(228), "1111111111111111101001"],
  [String.fromCharCode(229), "111111111111111100111"],
  [String.fromCharCode(230), "111111111111111101000"],
  [String.fromCharCode(231), "11111111111111111110011"],
  [String.fromCharCode(232), "1111111111111111101010"],
  [String.fromCharCode(233), "1111111111111111101011"],
  [String.fromCharCode(234), "1111111111111111111101110"],
  [String.fromCharCode(235), "1111111111111111111101111"],
  [String.fromCharCode(236), "111111111111111111110100"],
  [String.fromCharCode(237), "111111111111111111110101"],
  [String.fromCharCode(238), "11111111111111111111101010"],
  [String.fromCharCode(239), "11111111111111111110100"],
  [String.fromCharCode(240), "11111111111111111111101011"],
  [String.fromCharCode(241), "111111111111111111111100110"],
  [String.fromCharCode(242), "11111111111111111111101100"],
  [String.fromCharCode(243), "11111111111111111111101101"],
  [String.fromCharCode(244), "111111111111111111111100111"],
  [String.fromCharCode(245), "111111111111111111111101000"],
  [String.fromCharCode(246), "111111111111111111111101001"],
  [String.fromCharCode(247), "111111111111111111111101010"],
  [String.fromCharCode(248), "111111111111111111111101011"],
  [String.fromCharCode(249), "1111111111111111111111111110"],
  [String.fromCharCode(250), "111111111111111111111101100"],
  [String.fromCharCode(251), "111111111111111111111101101"],
  [String.fromCharCode(252), "111111111111111111111101110"],
  [String.fromCharCode(253), "111111111111111111111101111"],
  [String.fromCharCode(254), "111111111111111111111110000"],
  [String.fromCharCode(255), "11111111111111111111101110"],
  [HUFFMAN_EOS, "111111111111111111111111111111"],
]);

class HPackCtx {
  static #STATIC_TABLE = {
    1: [":authority", ""],
    2: [":method", "GET"],
    3: [":method", "POST"],
    4: [":path", "/"],
    5: [":path", "/index.html"],
    6: [":scheme", "http"],
    7: [":scheme", "https"],
    8: [":status", "200"],
    9: [":status", "204"],
    10: [":status", "206"],
    11: [":status", "304"],
    12: [":status", "400"],
    13: [":status", "404"],
    14: [":status", "500"],
    15: ["accept-charset", ""],
    16: ["accept-encoding", "gzip, deflate"],
    17: ["accept-language", ""],
    18: ["accept-ranges", ""],
    19: ["accept", ""],
    20: ["access-control-allow-origin", ""],
    21: ["age", ""],
    22: ["allow", ""],
    23: ["authorization", ""],
    24: ["cache-control", ""],
    25: ["content-disposition", ""],
    26: ["content-encoding", ""],
    27: ["content-language", ""],
    28: ["content-length", ""],
    29: ["content-location", ""],
    30: ["content-range", ""],
    31: ["content-type", ""],
    32: ["cookie", ""],
    33: ["date", ""],
    34: ["etag", ""],
    35: ["expect", ""],
    36: ["expires", ""],
    37: ["from", ""],
    38: ["host", ""],
    39: ["if-match", ""],
    40: ["if-modified-since", ""],
    41: ["if-none-match", ""],
    42: ["if-range", ""],
    43: ["if-unmodified-since", ""],
    44: ["last-modified", ""],
    45: ["link", ""],
    46: ["location", ""],
    47: ["max-forwards", ""],
    48: ["proxy-authenticate", ""],
    49: ["proxy-authorization", ""],
    50: ["range", ""],
    51: ["referer", ""],
    52: ["refresh", ""],
    53: ["retry-after", ""],
    54: ["server", ""],
    55: ["set-cookie", ""],
    56: ["strict-transport-security", ""],
    57: ["transfer-encoding", ""],
    58: ["user-agent", ""],
    59: ["vary", ""],
    60: ["via", ""],
    61: ["www-authenticate", ""],
  };
  static #STATIC_TABLE_MAX = 62;

  #maxDynamicTableLength;
  #dynamicTable;

  constructor() {
    this.#dynamicTable = [];
    this.#maxDynamicTableLength = 4096;
  }

  #indexTable = (index) => {
    const value =
      index < HPackCtx.#STATIC_TABLE_MAX
        ? HPackCtx.#STATIC_TABLE[index]
        : this.#dynamicTable[index - HPackCtx.#STATIC_TABLE_MAX];

    if (!value) {
      throw new Error(`Failed to find index in HPACK tables ${index}`);
    }

    return value;
  };

  #insertDynamicTable = (value) => {
    this.#dynamicTable.splice(0, 0, value);

    let tableSize = 0;
    const tooBigIndex = this.#dynamicTable.findIndex((entry) => {
      const entrySize = entry[0].length + entry[1].lenght + 32;
      tableSize += entrySize;
      return tableSize > this.#maxDynamicTableLength;
    });

    if (tooBigIndex !== -1) {
      this.#dynamicTable.length = tooBigIndex;
    }
  };

  decode = (block) => {
    const fields = [];

    while (block.length > 0) {
      let size = 0;

      const firstBit = block[0] & 128;
      const secondBit = block[0] & 64;
      const thirdBit = block[0] & 32;
      const fourthBit = block[0] & 16;

      let field;

      const decodeInteger = (mask) => {
        let int = block[size] & (0xff >> mask);

        size += 1;

        if (int === 0xff >> mask) {
          // large int

          let next;
          let m = 0;

          do {
            next = block[size++];
            const val = next & 0b0111_1111;
            int = int + val * 2 ** m;
            m += 7;
          } while (next & 0b1000_0000);

          return int;
        }
        return int;
      };

      const decodeHuffman = (length) => {
        let string = "";
        let remaining = length;

        let cur = HUFFMAN_TREE;

        while (remaining > 0) {
          const nextOctet = block[size];

          for (let i = 7; i >= 0; i--) {
            const nextBit = (nextOctet >> i) & 0x01;
            cur = cur[nextBit ? 1 : 0];

            if (typeof cur === "string") {
              string += cur;
              cur = HUFFMAN_TREE;
            } else if (typeof cur === "symbol" && cur === HUFFMAN_EOS) {
              throw new Error("what");
            }
          }

          size++;
          remaining--;
        }

        return string;
      };

      const decodeString = () => {
        const huffman = block[size] & 128;

        const length = decodeInteger(1);

        if (huffman) {
          return decodeHuffman(length);
        } else {
          const s = new TextDecoder().decode(
            block.subarray(size, size + length)
          );
          size += length;
          return s;
        }
      };

      // Indexed Header Field Representation
      if (firstBit) {
        const index = decodeInteger(1);
        const tabled = this.#indexTable(index);

        field = tabled;
      } else {
        // Literal Header Field with Incremental Indexing
        if (secondBit) {
          const index = decodeInteger(2);

          let headerName;
          if (index === 0) {
            headerName = decodeString();
          } else {
            headerName = this.#indexTable(index)[0];
          }

          const headerValue = decodeString();

          field = [headerName, headerValue];

          this.#insertDynamicTable(field);
        } else {
          if (thirdBit) {
            throw new Error("dynamic thing");
          } else {
            // Literal Header Field Never Indexed
            // Literal Header Field without Indexing

            const index = decodeInteger(4);

            let headerName;
            if (index === 0) {
              headerName = decodeString();
            } else {
              headerName = this.#indexTable(index)[0];
            }

            const headerValue = decodeString();

            field = [headerName, headerValue];
          }
        }
      }

      if (typeof field === "undefined") {
        throw new Error("field was not set");
      }
      fields.push(field);

      if (size === 0) {
        throw new Error("size was not set");
      }
      block = block.subarray(size);
    }

    return fields;
  };
  encode = (fields) => {
    let block = Buffer.from([]);

    // TODO: squimsh the bytes
    for (const field of fields) {
      if (typeof field[0] !== "string" || typeof field[1] !== "string") {
        throw new Error("invalid type of header");
      }

      // let's just pick 6.2.1. Literal Header Field with Incremental Indexing
      block = Buffer.concat([block, Buffer.from([64])]);

      const encodeString = (s) => {
        const length = s.length;
        if (length > 126) {
          throw new Error("long header not implemented");
        }
        block = Buffer.concat([block, Buffer.from([length /*huffman false*/])]);
        block = Buffer.concat([block, new TextEncoder().encode(s)]);
      };

      encodeString(field[0]);
      encodeString(field[1]);
    }

    return block;
  };
}

const reverseMap = (c) =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [v, k]));

const FRAME_HEADER_SIZE = 3 + 1 + 1 + 4;

const PREFANCE_RECEIVED_FRAME_TYPE = Symbol("PREFACE_RECEIVED");
const FRAME_TYPE = {
  DATA: 0x0,
  HEADERS: 0x1,
  PRIORITY: 0x2,
  RST_STREAM: 0x3,
  SETTINGS: 0x04,
  PUSH_PROMISE: 0x5,
  PING: 0x6,
  GOAWAY: 0x7,
  WINDOW_UPDATE: 0x08,
  CONTINUATION: 0x09,
};
const FRAME_TYPE_NAME = reverseMap(FRAME_TYPE);

const SETTING = {
  SETTINGS_HEADER_TABLE_SIZE: 0x01,
  SETTINGS_ENABLE_PUSH: 0x02,
  SETTINGS_MAX_CONCURRENT_STREAMS: 0x03,
  SETTINGS_INITIAL_WINDOW_SIZE: 0x04,
  SETTINGS_MAX_FRAME_SIZE: 0x05,
  SETTINGS_MAX_HEADER_LIST_SIZE: 0x06,
};
const SETTING_NAME = reverseMap(SETTING);

const HEADERS_FLAG = {
  END_HEADERS: 0x04,
  END_STREAM: 0x01,
  PRIORITY: 0x20,
  PADDED: 0x08,
};
const HEADERS_FLAG_NAME = reverseMap(HEADERS_FLAG);

const DATA_FLAG = {
  PADDED: 0x08,
  END_STREAM: 0x01,
};

const ERROR_CODE = {
  NO_ERROR: 0,
  PROTOCOL_ERROR: 0x01,
  INTERNAL_ERROR: 0x02,
  FLOW_CONTROL_ERROR: 0x03,
  SETTINGS_TIMEOUT: 0x04,
  STREAM_CLOSED: 0x05,
  FRAME_SIZE_ERROR: 0x06,
  REFUSED_STREAM: 0x07,
  CANCEL: 0x08,
  COMPRESSION_ERROR: 0x09,
  CONNECT_ERROR: 0x0a,
  ENHANCE_YOUR_CALM: 0x0b,
  INADEQUATE_SECURITY: 0x0c,
  HTTP_1_1_REQUIRED: 0x0d,
};
const ERROR_CODE_NAME = reverseMap(ERROR_CODE);

class Http11Error extends Error {}

const frameReader = (frameCb) => {
  const STATE = {
    PREFACE: 0,
    FRAME_HEAD: 1,
    FRAME_PAYLOAD: 2,
  };
  const CONNECTION_PREFACE = new TextEncoder().encode(
    "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"
  );

  let state = STATE.PREFACE;
  let frameHead;
  let buf = Buffer.from([]);

  return (data) => {
    buf = Buffer.concat([buf, data]);

    while (true) {
      switch (state) {
        case STATE.PREFACE: {
          if (buf.length < 24) {
            return;
          }

          const preface = buf.subarray(0, 24);
          buf = buf.subarray(24);
          if (Buffer.compare(preface, CONNECTION_PREFACE) !== 0) {
            try {
              const decoded = new TextDecoder().decode(preface);
              if (
                decoded.includes("HTTP/1.1") ||
                /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|TRACE) /.test(decoded)
              ) {
                frameCb(new Http11Error());
              } else {
                frameCb(new Error("invalid preface"));
              }
            } catch (e) {
              frameCb(new Error("invalid preface"));
            }
            return;
          }

          frameCb(null, {
            length: 0,
            type: PREFANCE_RECEIVED_FRAME_TYPE,
            flags: 0,
            streamIdentifier: 0,
          });

          state = STATE.FRAME_HEAD;

          break;
        }
        case STATE.FRAME_HEAD: {
          if (buf.length < FRAME_HEADER_SIZE) {
            return;
          }

          const frameHeader = buf.subarray(0, FRAME_HEADER_SIZE);
          buf = buf.subarray(FRAME_HEADER_SIZE);

          const length =
            (frameHeader[0] << 16) | (frameHeader[1] << 8) | frameHeader[2];
          const type = frameHeader[3];
          const flags = frameHeader[4];
          const streamIdentifier =
            frameHeader.readUint32BE(5) & (0xff_ff_ff_ff >> 1);

          state = STATE.FRAME_PAYLOAD;
          frameHead = {
            length,
            type,
            flags,
            streamIdentifier,
          };

          break;
        }
        case STATE.FRAME_PAYLOAD: {
          if (buf.length < frameHead.length) {
            return;
          }

          const payload = buf.subarray(0, frameHead.length);
          buf = buf.subarray(frameHead.length);

          frameCb(null, {
            ...frameHead,
            payload,
          });

          state = STATE.FRAME_HEAD;

          break;
        }
        default:
          throw new Error("unknown state", state);
      }
    }
  };
};

const encodeFrame = (frame) => {
  if (typeof frame.flags !== "number") {
    throw new Error(`Flags of frame are not number: ${frame.flags}`);
  }
  if (typeof frame.type !== "number") {
    throw new Error(`Type of frame is not a number: ${frame.type}`);
  }
  const length = frame.payload.length;
  const buffer = Buffer.alloc(FRAME_HEADER_SIZE + length);
  if (length > 2 ** 24) {
    throw new Error(`Frame is too long: ${length}`);
  }
  buffer[0] = length >> 16;
  buffer[1] = (length >> 8) & 0xff;
  buffer[2] = length & 0xff;
  if (!(frame.type in FRAME_TYPE_NAME)) {
    throw new Error(`Trying to write unknown frame type: ${frame.type}`);
  }
  buffer[3] = frame.type;
  if (frame.flags > 0xff) {
    throw new Error(`Frame flags do not fit in a byte: ${frame.flags}`);
  }
  buffer[4] = frame.flags;
  if (typeof frame.streamIdentifier !== "number") {
    throw new Error(
      `Frame stream identifier is not a number: ${frame.streamIdentifier}`
    );
  }
  buffer.writeUint32BE(frame.streamIdentifier, 5);

  frame.payload.copy(buffer, FRAME_HEADER_SIZE);

  return buffer;
};

/**
 * @typedef Request
 * @type {object}
 * @property {string} method
 * @property {string} path
 * @property {URLSearchParams} query
 * @property {URL} url
 * @property {string[][]} headers
 * @property {object} peer
 */

/**
 * @typedef ResponseWriteHeaders
 * @type {string[][]}
 *
 * @typedef ResponseWriteHeadParam
 * @type {object}
 * @property {number} status
 * @property {ResponseWriteHeaders} headers
 *
 * @callback ResponseWriteHead
 * @param {ResponseWriteHeadParam} head
 *
 * @callback ResponseWriteBody
 * @param {Buffer|string} body
 *
 * @typedef ResponseWriter
 * @type {object}
 * @property {ResponseWriteHead} writeHead
 * @property {ResponseWriteBody} body
 */

const buildRequest = (rawH2Request) => {
  const getField = (name) => {
    const fields = rawH2Request.fields.filter((f) => f[0] === name);
    if (fields.length === 0) {
      return undefined;
    }
    if (fields.length === 1) {
      return fields[0][1];
    }
    return fields.map((f) => f[1]).join(", ");
  };

  const method = getField(":method");
  if (!method) {
    return {
      ok: false,
      error: "Missing :method",
    };
  }
  const scheme = getField(":scheme");
  if (!scheme) {
    return {
      ok: false,
      error: "Missing :scheme",
    };
  }
  const authority = getField(":authority");
  if (!scheme) {
    return {
      ok: false,
      error: "Missing :scheme",
    };
  }
  const path = getField(":path");
  if (!path) {
    return {
      ok: false,
      error: "Missing :path",
    };
  }

  // this is probably bad
  const url = new URL(`${scheme}://${authority}${path}`);

  return {
    ok: true,
    request: {
      method,
      path: url.pathname,
      query: url.searchParams,
      url,
      headers: rawH2Request.fields
        .filter((f) => !f[0].startsWith(":"))
        .map(([name, value]) => [name.toLowerCase(), value]),
      peer: rawH2Request.peer,
    },
  };
};

const DEFAULT_FLOW_CONTROL_WINDOW_SIZE = 65535;

/**
 * @param {EventEmitter} server
 */
const handleConnection =
  (server) =>
  /**
   *
   * @param {net.Socket} socket
   */
  (socket) => {
    const peer = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`received connection from ${peer}`);

    const hpackDecode = new HPackCtx();
    const hpackEncode = new HPackCtx();
    const peerSettings = new Map();
    const streams = new Map();

    const onData = frameReader((err, frame) => {
      if (err) {
        if (err instanceof Http11Error) {
          socket.write(
            "HTTP/1.1 505 HTTP Version Not Supported\r\nConnection: close\r\n\r\n"
          );
          socket.destroy();
          return;
        }

        console.warn("error from frame layer", err);
        socket.destroy();
        return;
      }

      if (debug) {
        console.log("received frame", FRAME_TYPE_NAME[frame.type], frame);
      }

      switch (frame.type) {
        case PREFANCE_RECEIVED_FRAME_TYPE: {
          socket.write(
            encodeFrame({
              type: FRAME_TYPE.SETTINGS,
              flags: 0,
              streamIdentifier: 0,
              payload: Buffer.from([]),
            })
          );
          break;
        }
        case FRAME_TYPE.HEADERS: {
          if (!streams.has(frame.streamIdentifier)) {
            streams.set(frame.streamIdentifier, {
              headerBuffer: Buffer.from([]),
              endHeaders: false,
              flowControlWindowSize:
                peerSettings.get(SETTING.SETTINGS_INITIAL_WINDOW_SIZE) ??
                DEFAULT_FLOW_CONTROL_WINDOW_SIZE,
            });
          }

          // END_HEADERS
          if ((frame.flags & HEADERS_FLAG.END_HEADERS) !== 0) {
            streams.get(frame.streamIdentifier).endHeaders = true;
          }

          // PRIORITY
          const priorityFlag = (frame.flags & HEADERS_FLAG.PRIORITY) !== 0;
          // PADDED
          const paddedFlag = (frame.flags & HEADERS_FLAG.PADDED) !== 0;

          let payload = frame.payload;

          let paddingLength = 0;
          if (paddedFlag) {
            paddingLength = payload[0];
            payload = payload.subarray(1);
          }

          if (priorityFlag) {
            // skip over Exclusive/Stream Dependency, Weight
            payload = payload.subarray(5);
          }

          if (paddedFlag) {
            if (paddingLength > payload.length) {
              console.warn("too much padding");
              socket.destroy();
              return;
            }
            payload = payload.subarray(0, payload.length - paddingLength);
          }

          if (streams.get(frame.streamIdentifier).endHeaders) {
            const fieldBlockFragement = payload;
            let fields;
            try {
              fields = hpackDecode.decode(fieldBlockFragement);
            } catch (e) {
              console.warn("failed to decode HPACK block", e);
              socket.destroy();
              return;
            }

            const rawH2Request = {
              peer: {
                address: socket.remoteAddress,
                port: socket.remotePort,
              },
              fields,
            };

            const request = buildRequest(rawH2Request);

            const writeDataFrame = (body, flags, cb) => {
              const payload = Buffer.from(body);
              const h2stream = streams.get(frame.streamIdentifier);

              if (!h2stream) {
                setImmediate(cb);
                return;
              }

              const doWrite = () => {
                h2stream.flowControlWindowSize -= payload.length;

                socket.write(
                  encodeFrame({
                    type: FRAME_TYPE.DATA,
                    flags: flags,
                    payload,
                    streamIdentifier: frame.streamIdentifier,
                  })
                );
                cb();
              };

              if (h2stream.flowControlWindowSize < payload.length) {
                h2stream.waitingForFlowControlWindowSize = payload.length;
                h2stream.waitingForFlowControlWindowCb = doWrite;
              } else {
                setImmediate(doWrite);
              }
            };

            const bodyStream = new stream.Writable({
              write: (chunk, encoding, next) => {
                const frameSize =
                  peerSettings.get(SETTING.SETTINGS_MAX_FRAME_SIZE) ?? 16_384;
                const maxPayloadSize = frameSize - 24;

                if (encoding !== "buffer") {
                  throw new Error("only buffers are supported");
                }

                const writePart = () => {
                  const chunkchunk = chunk.subarray(0, maxPayloadSize);
                  chunk = chunk.subarray(maxPayloadSize);

                  writeDataFrame(chunkchunk, 0, () => {
                    if (chunk.length > 0) {
                      writePart();
                    } else {
                      next();
                    }
                  });
                };
                writePart();
              },
              final: (cb) => {
                writeDataFrame(Buffer.from([]), DATA_FLAG.END_STREAM, () => {});
                cb(null);
              },
            });

            /**
             * @type {ResponseWriter}
             */
            const resWriter = {
              writeHead: (param) => {
                const hasBody = param.contentLength;

                const responseBlock = hpackEncode.encode([
                  [":status", String(param.status)],
                  ...(hasBody
                    ? [["content-length", String(param.contentLength)]]
                    : []),
                  ...(param.headers
                    ? param.headers.filter(
                        (h) =>
                          !h[0].startsWith(":") &&
                          h[0].toLowerCase() !== "content-length"
                      )
                    : []),
                ]);

                socket.write(
                  encodeFrame({
                    type: FRAME_TYPE.HEADERS,
                    flags:
                      HEADERS_FLAG.END_HEADERS |
                      (hasBody ? 0 : HEADERS_FLAG.END_STREAM),
                    streamIdentifier: frame.streamIdentifier,
                    payload: responseBlock,
                  })
                );
              },
              body: bodyStream,
            };

            // friends, we got a request!

            if (request.ok) {
              server.emit("request", request.request, resWriter);
            } else {
              resWriter.writeHead({
                status: 400,
                headers: [["date", new Date().toUTCString()]],
              });
            }
          } else {
            throw new Error("expecting CONTINUATION is not yet supported");
          }

          break;
        }
        case FRAME_TYPE.SETTINGS: {
          // ACK
          if ((frame.flags & 0x1) !== 0) {
            if (frame.length !== 0) {
              console.warn("received non-empty SETTINGS ack frame");
              socket.destroy();
              return;
            }

            break;
          }

          if (frame.streamIdentifier !== 0) {
            console.warn("stream identifier for a SETTINGS");
            socket.destroy();
            return;
          }
          if (frame.length % 6 !== 0) {
            console.warn("invalid length for SETTINGS frame");
            socket.destroy();
            return;
          }

          for (let i = 0; i < frame.length; i += 6) {
            const identifier = frame.payload.readUint16BE(i);
            const value = frame.payload.readUint32BE(i + 2);
            if (debug) {
              console.log(
                "SETTINGS setting",
                SETTING_NAME[identifier],
                "=",
                value
              );
            }
            peerSettings[SETTING_NAME[identifier]] = value;

            if (identifier === SETTING.SETTINGS_HEADER_TABLE_SIZE) {
              throw new Error("cannot change table size yet");
            }
          }

          break;
        }
        case FRAME_TYPE.RST_STREAM: {
          const errorCode = frame.payload.readUint32BE();

          if (frame.streamIdentifier === 0) {
            socket.destroy();
          }

          streams.delete(frame.streamIdentifier);

          if (debug) {
            console.log("stream reset because of", ERROR_CODE_NAME[errorCode]);
          }

          break;
        }
        case FRAME_TYPE.PING: {
          if (frame.streamIdentifier !== 0) {
            socket.destroy();
          }

          socket.write(
            encodeFrame({
              type: FRAME_TYPE.PING,
              flags: 0x01, // ACK
              streamIdentifier: 0,
              payload: frame.payload,
            })
          );
          break;
        }
        case FRAME_TYPE.WINDOW_UPDATE: {
          // whatever
          const increment = frame.payload.readUint32BE();

          if (frame.streamIdentifier) {
            const h2stream = streams.get(frame.streamIdentifier);
            if (h2stream) {
              h2stream.flowControlWindowSize += increment;

              if (
                typeof h2stream.waitingForFlowControlWindowSize === "number" &&
                h2stream.flowControlWindowSize >=
                  h2stream.waitingForFlowControlWindowSize
              ) {
                h2stream.waitingForFlowControlWindowSize = undefined;
                const cb = h2stream.waitingForFlowControlWindowCb;
                h2stream.waitingForFlowControlWindowCb = undefined;
                cb();
              }
            } else {
              socket.destroy();
            }
          }

          break;
        }
        case FRAME_TYPE.GOAWAY: {
          const errorCode = frame.payload.readUint32BE(4);

          if (debug) {
            console.log("goaway with code", ERROR_CODE_NAME[errorCode]);
          }

          socket.destroy();

          break;
        }
        default: {
          console.warn(
            `unsupported frame type ${
              FRAME_TYPE_NAME[frame.type] ?? frame.type
            }`
          );
        }
      }
    });

    socket.on("data", onData);

    socket.on("error", (err) => {
      server.emit("error", err);
    });

    socket.on("close", () => {
      server.emit("close");
    });
  };

/**
 * @callback onConnectionCallback
 * @param {net.Socket} socket
 * @returns {void}
 */

/**
 * @typedef Http2ServerReturn
 * @type {object}
 * @property {EventEmitter} server
 * @property {onConnectionCallback} onConnection
 */

/**
 * @returns {Http2ServerReturn}
 */
export const createH2Server = () => {
  const server = new EventEmitter();

  return {
    server,
    onConnection: handleConnection(server),
  };
};

const { server, onConnection } = createH2Server();

const rootPath = process.env.ROOT_PATH ?? ".";

server.on(
  "request",
  /**
   * @param {Request} req
   * @param {ResponseWriter} res
   */
  (req, res) => {
    console.log("received a request", req.method, req.path);

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead({ status: 405 });
    }

    const filepath = path.join(rootPath, path.normalize(req.path));

    console.log("opening", filepath);

    const serveFile = (filepath, size) => {
      const contentType =
        {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".avif": "image/avif",
          ".svg": "image/svg+xml",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".txt": "text/plain",
        }[path.extname(filepath)] ?? "application/octet-stream";

      res.writeHead({
        status: 200,
        contentLength: size,
        headers: [["content-type", contentType]],
      });

      const fileStream = fs.createReadStream(filepath, {
        highWaterMark: 1_048_576,
      });

      fileStream.pipe(res.body);
    };

    fs.stat(filepath, (err, stat) => {
      if (err) {
        if (err.code === "ENOENT") {
          res.writeHead({ status: 404 });
        } else {
          console.error("failed to open", err);
          res.writeHead({ status: 500 });
        }
        return;
      }

      if (stat.isDirectory()) {
        const indexhtml = path.join(filepath, "index.html");
        fs.stat(indexhtml, (err, stat) => {
          if (err) {
            if (err.code === "ENOENT") {
              fs.readdir(filepath, (err, files) => {
                if (err) {
                  console.error("failed to read dir", err);
                  res.writeHead({ status: 500 });
                  return;
                }

                const html = `<ul>${files
                  .map(
                    (file) =>
                      `<li><a href="${encodeURIComponent(
                        file
                      )}">${file}</a></li>`
                  )
                  .join("\n")}</ul>`;

                res.writeHead({
                  status: 200,
                  contentLength: html.length,
                  headers: [["content-type", "text/html; charset=utf-8"]],
                });
                res.body.write(html);
                res.body.end();
              });
              return;
            } else {
              console.error("failed to stat index.html", err);
              res.writeHead({ status: 500 });
            }
            return;
          }

          if (stat.isFile()) {
            serveFile(indexhtml, stat.size);
          } else {
            console.error(`${indexhtml} exists but is not a regular file`);
            res.writeHead({ status: 500 });
          }
        });
        return;
      }

      if (stat.isFile()) {
        serveFile(filepath, stat.size);
        return;
      }

      console.log(`File ${filepath} is neither a directory nor regular file`);
      res.writeHead({ status: 404 });
    });
  }
);

server.on("error", (err) => {
  console.log("error", err);
});

const tcpServer = net.createServer(onConnection).on("error", (err) => {
  console.error(`error: ${err}`);
});

tcpServer.listen(8080, () => {
  console.log("Listening on", tcpServer.address());
});
