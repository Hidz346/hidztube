function parseProto(data) {
  let i = 0;
  const res = {};
  const len = data.length;

  while (i < len) {
    let key = 0;
    let shift = 0;
    while (i < len) {
      const b = data[i++];
      key |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }

    const fieldNum = key >> 3;
    const wireType = key & 0x07;

    if (wireType === 0) {
      let val = 0;
      shift = 0;
      while (i < len) {
        const b = data[i++];
        val |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
      }
      if (!res[fieldNum]) res[fieldNum] = [];
      res[fieldNum].push({ type: 'varint', val });
    } else if (wireType === 2) {
      let length = 0;
      shift = 0;
      while (i < len) {
        const b = data[i++];
        length |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
      }
      const val = data.subarray(i, i + length);
      i += length;
      if (!res[fieldNum]) res[fieldNum] = [];
      res[fieldNum].push({ type: 'bytes', val });
    } else if (wireType === 1) {
      const val = data.subarray(i, i + 8);
      i += 8;
      if (!res[fieldNum]) res[fieldNum] = [];
      res[fieldNum].push({ type: '64bit', val });
    } else if (wireType === 5) {
      const val = data.subarray(i, i + 4);
      i += 4;
      if (!res[fieldNum]) res[fieldNum] = [];
      res[fieldNum].push({ type: '32bit', val });
    } else {
      break;
    }
  }

  return res;
}

module.exports = { parseProto };
