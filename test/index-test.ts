import test from 'ava';
import * as execa from 'execa';
import { readFileSync, statSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { runInNewContext } from 'vm';

const app = resolve(process.cwd(), 'dist', 'src', 'index.js');
const entry = join('dist', 'test', 'fixtures', 'entry.js');

function readCodeFile(codeFile: string): string {
  return readFileSync(join(process.cwd(), codeFile)).toString();
}

test.beforeEach('remove test file', t => {
  const seed = Math.random() * 1000000000000000;
  const codeFile = join('dist', 'test', 'fixtures', `result-${seed}.js`);
  const mapFile = join('dist', 'test', 'fixtures', `result-${seed}.js.map`);
  t.context.codeFile = codeFile;
  t.context.mapFile = mapFile;
});

test.afterEach(t => {
  try {
    if (statSync(t.context.codeFile).isFile()) {
      unlinkSync(t.context.codeFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
  try {
    if (statSync(t.context.mapFile).isFile()) {
      unlinkSync(t.context.mapFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
});

test('cli without parameters and config file should show error', async t => {
  const options = {
    env: {
      DEBUG: 'cli'
    }
  };
  try {
    await execa('node', [app], options);
    t.fail('There should be an error from the cli');
  } catch (err) {
    t.regex(err.stderr.toString(), /Missing entry-point/);
  }
});

test('cli with entry-point should output bundle', async t => {
  const args = [app, '--entry', entry];
  const result = await execa('node', args, {cwd: process.cwd()});
  const code = result.stdout.toString();

  let stdout = '';
  const sandbox = {
    console: {
      log(msg: string): void {
        stdout += msg;
      }
    }
  };
  runInNewContext(code, sandbox);

  t.is(stdout, 'string');
});

test('cli with entry-point and out-file should write bundle', async t => {
  const args = [app, '--entry', entry, '--out-file', t.context.codeFile];
  await execa('node', args, {cwd: process.cwd()});
  const code = readCodeFile(t.context.codeFile);

  let output = '';
  const sandbox = {
    console: {
      log(msg: string): void {
        output += msg;
      }
    }
  };
  runInNewContext(code, sandbox);

  t.is(output, 'string');
});

test('cli with entry-point and source-map should output bundle', async t => {
  const args = [app, '--entry', entry, '--source-map', 'true'];
  const result = await execa('node', args, {cwd: process.cwd()});
  const code = result.stdout.toString();

  t.regex(code, /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/);
});

test('cli with entry-point, out-file and source-map should write external map', async t => {
  const args = [app, '--entry', entry, '--out-file', t.context.codeFile, '--source-map', 'true'];
  await execa('node', args, {cwd: process.cwd()});
  const map = JSON.parse(readFileSync(join(process.cwd(), t.context.mapFile)).toString());

  t.truthy(map.sourcesContent[0].match(/: string/));
});

test("cli with entry-point, out-file and source-map 'inline' should write inline map", async t => {
  const args: string[] = [app, '--entry', entry, '--out-file', t.context.codeFile, '--source-map', 'inline'];
  await execa('node', args, {cwd: process.cwd()});
  const code = readCodeFile(t.context.codeFile);
  try {
    statSync(t.context.mapFile);
    t.fail('There should be no external map file');
  } catch (e) {
    // ignore
  }

  t.regex(code, /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/);
});
