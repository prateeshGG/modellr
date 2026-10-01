import { describe, it, expect } from 'vitest';
import { parseSSEStream, createSSEParser } from '../../src/lib/aiClient';

const enc = new TextEncoder();

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
}

/** Split a string's UTF-8 bytes at the given byte offsets. */
function splitBytes(text: string, offsets: number[]): Uint8Array[] {
  const bytes = enc.encode(text);
  const out: Uint8Array[] = [];
  let prev = 0;
  for (const o of [...offsets, bytes.length]) {
    out.push(bytes.slice(prev, o));
    prev = o;
  }
  return out.filter((c) => c.length > 0);
}

async function collect(chunks: Uint8Array[]) {
  const got: string[] = [];
  const sawDone = await parseSSEStream(streamOf(chunks), (d) => got.push(d));
  return { got, sawDone };
}

const delta = (s: string) => JSON.stringify({ choices: [{ delta: { content: s } }] });

describe('parseSSEStream', () => {
  it('parses simple events and [DONE]', async () => {
    const body = `data: ${delta('Hel')}\n\ndata: ${delta('lo')}\n\ndata: [DONE]\n\n`;
    const { got, sawDone } = await collect([enc.encode(body)]);
    expect(got).toEqual([delta('Hel'), delta('lo')]);
    expect(sawDone).toBe(true);
  });

  it('handles a stream that ends without [DONE]', async () => {
    const { got, sawDone } = await collect([enc.encode(`data: ${delta('a')}\n\n`)]);
    expect(got).toEqual([delta('a')]);
    expect(sawDone).toBe(false);
  });

  it('does not drop lines split mid-line across chunks', async () => {
    const body = `data: ${delta('one')}\n\ndata: ${delta('two')}\n\ndata: [DONE]\n\n`;
    // Every possible 2-way split must yield the same result.
    const total = enc.encode(body).length;
    for (let cut = 1; cut < total; cut++) {
      const { got, sawDone } = await collect(splitBytes(body, [cut]));
      expect(got).toEqual([delta('one'), delta('two')]);
      expect(sawDone).toBe(true);
    }
  });

  it('survives byte-by-byte delivery', async () => {
    const body = `data: ${delta('a b c')}\n\ndata: ${delta('d')}\n\ndata: [DONE]\n\n`;
    const offsets = Array.from({ length: enc.encode(body).length - 1 }, (_, i) => i + 1);
    const { got, sawDone } = await collect(splitBytes(body, offsets));
    expect(got).toEqual([delta('a b c'), delta('d')]);
    expect(sawDone).toBe(true);
  });

  it('keeps JSON intact when split mid-JSON', async () => {
    const payload = delta('{"a":"b"}');
    const body = `data: ${payload}\n\n`;
    const mid = body.indexOf('"content"') + 4;
    const { got } = await collect(splitBytes(body, [mid]));
    expect(got).toEqual([payload]);
    expect(JSON.parse(got[0]).choices[0].delta.content).toBe('{"a":"b"}');
  });

  it('keeps multi-byte characters split across chunks (emoji, CJK, accents)', async () => {
    const text = 'héllo 世界 😀 ✓';
    const body = `data: ${delta(text)}\n\ndata: ${delta('🔑')}\n\n`;
    const bytes = enc.encode(body);
    // Cut at every byte offset including inside multi-byte sequences.
    for (let cut = 1; cut < bytes.length; cut++) {
      const { got } = await collect([bytes.slice(0, cut), bytes.slice(cut)]);
      expect(got.map((g) => JSON.parse(g).choices[0].delta.content)).toEqual([text, '🔑']);
    }
    // And byte-by-byte.
    const single = Array.from(bytes, (b) => Uint8Array.of(b));
    const { got } = await collect(single);
    expect(got.map((g) => JSON.parse(g).choices[0].delta.content)).toEqual([text, '🔑']);
  });

  it('handles CRLF line endings, including CRLF split between chunks', async () => {
    const body = `data: ${delta('x')}\r\n\r\ndata: ${delta('y')}\r\n\r\ndata: [DONE]\r\n\r\n`;
    const full = await collect([enc.encode(body)]);
    expect(full.got).toEqual([delta('x'), delta('y')]);
    expect(full.sawDone).toBe(true);

    const bytes = enc.encode(body);
    for (let cut = 1; cut < bytes.length; cut++) {
      const r = await collect([bytes.slice(0, cut), bytes.slice(cut)]);
      expect(r.got).toEqual([delta('x'), delta('y')]);
    }
  });

  it('handles bare CR line endings', async () => {
    const { got } = await collect([enc.encode(`data: ${delta('x')}\r\rdata: ${delta('y')}\r\r`)]);
    expect(got).toEqual([delta('x'), delta('y')]);
  });

  it('ignores comments / keepalives / other fields', async () => {
    const body = `: keepalive\n\nevent: message\nid: 7\nretry: 100\ndata: ${delta('ok')}\n\n:ping\n\ndata: [DONE]\n\n`;
    const { got, sawDone } = await collect([enc.encode(body)]);
    expect(got).toEqual([delta('ok')]);
    expect(sawDone).toBe(true);
  });

  it('accepts "data:" without the optional space and tolerates a BOM', async () => {
    const { got } = await collect([enc.encode(`\uFEFFdata:${delta('a')}\n\ndata:${delta('b')}\n\n`)]);
    expect(got).toEqual([delta('a'), delta('b')]);
  });

  it('does not require blank lines between events', async () => {
    const { got } = await collect([enc.encode(`data: ${delta('a')}\ndata: ${delta('b')}\n`)]);
    expect(got).toEqual([delta('a'), delta('b')]);
  });

  it('flushes a final line that has no trailing newline', async () => {
    const { got } = await collect([enc.encode(`data: ${delta('tail')}`)]);
    expect(got).toEqual([delta('tail')]);
  });

  it('ignores anything after [DONE]', async () => {
    const { got, sawDone } = await collect([enc.encode(`data: ${delta('a')}\n\ndata: [DONE]\n\ndata: ${delta('late')}\n\n`)]);
    expect(got).toEqual([delta('a')]);
    expect(sawDone).toBe(true);
  });

  it('propagates errors thrown by the callback', async () => {
    await expect(
      parseSSEStream(streamOf([enc.encode(`data: ${delta('a')}\n\n`)]), () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});

describe('createSSEParser', () => {
  it('is incremental and exposes done', () => {
    const got: string[] = [];
    const p = createSSEParser((d) => got.push(d));
    p.push('data: {"a"');
    expect(got).toEqual([]);
    p.push(':1}\n');
    expect(got).toEqual(['{"a":1}']);
    p.push('data: [DONE]\n');
    expect(p.done).toBe(true);
  });
});
