declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  execPath: string;
  pid: number;
  kill(pid: number, signal?: string): void;
  exitCode?: number;
  stdout: { write(s: string): void };
  stderr: { write(s: string): void };
};
declare const Buffer: {
  from(input: string, encoding?: string): any;
  byteLength(input: string): number;
  concat(chunks: any[]): any;
};
declare function require(name: string): any;
declare const module: { exports: any };
declare function fetch(input: string, init?: any): Promise<any>;
