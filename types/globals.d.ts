declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  execPath: string;
  exitCode?: number;
  stdout: { write(s: string): void };
  stderr: { write(s: string): void };
};
declare const Buffer: { from(input: string, encoding?: string): any };
declare function require(name: string): any;
declare const module: { exports: any };
