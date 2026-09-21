declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exitCode?: number;
  stdout: { write(s: string): void };
  stderr: { write(s: string): void };
};
declare function require(name: string): any;
declare const module: { exports: any };
