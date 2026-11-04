import { Writable } from 'node:stream';

export interface LogLine {
  level: string;
  msg?: string;
  [field: string]: unknown;
}

export class LogCapture extends Writable {
  readonly lines: LogLine[] = [];

  override _write(chunk: Buffer, _encoding: BufferEncoding, done: () => void): void {
    this.lines.push(JSON.parse(chunk.toString()) as LogLine);
    done();
  }

  requestLine(path: string): LogLine | undefined {
    return this.lines.find(
      (line) =>
        line.res !== undefined && (line.req as { path?: string } | undefined)?.path === path,
    );
  }

  text(): string {
    return JSON.stringify(this.lines);
  }
}
