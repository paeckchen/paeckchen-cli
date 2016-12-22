module.exports = function (w) {
  return {
    files: [
      'src/**/*.ts*',
      { pattern: 'test/fixtures/**', instrument: false }
    ],
    tests: [
      'test/**/*-test.ts*'
    ],
    compilers: {
      '**/*.ts': w.compilers.typeScript({ outDir: 'dist' })
    },
    env: {
      type: 'node'
    },
    testFramework: 'ava',
    setup: (w) => {
      process.cwd = function () {
        return require('path').resolve(w.localProjectDir);
      }
    },
    debug: false
  };
};
