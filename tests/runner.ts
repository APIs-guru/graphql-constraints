import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

import { expect, use as chaiUse } from 'chai';
import * as snapshots from './chai-snapshots';

import { fakeRootValue } from './fakeRootValue';

const argv = require('yargs').argv

chaiUse(snapshots.SnapshotMatchers({
  pathToSnaps: './tests/__snapshots/',
  devMode: !!argv.update
}));

const fixturesDir = path.join(__dirname, 'fixtures');
const testIDLs = glob.sync('**/?(*.)idl.graphql');

function test(name, idl, query = '', options = {}) {
  const testInput = {
    idl, query, options
  };
  const res = JSON.parse(
    execSync(argv.command, {input: JSON.stringify(testInput), stdio:['pipe', 'pipe', 2]}).toString()
  );
  expect(res).to.matchSnapshotJSON(name);
}


testIDLs.forEach(idlFile => {
  const dir = path.dirname(idlFile);
  let groupName = path.relative(fixturesDir, dir);
  describe(groupName, () => {
    const idl = fs.readFileSync(idlFile).toString();
    const rootValue = fakeRootValue(idl);

    const queriesGlob = path.join(dir, '*.query.graphql');
    const queries = glob.sync(queriesGlob);
    if (!queries.length) {
      const testName = path.join(groupName, path.basename(idlFile, '.idl.graphql'));
      const snapshotPath = path.join(testName + '.json');
      it(testName, () => {
        test(snapshotPath, idl);
      });
    }
    for (let queryFileName of queries) {
      let snapshotPath = path.join(groupName, path.basename(queryFileName, '.query.graphql')) + '.json';
      it(queryFileName, () => {
        let query = fs.readFileSync(queryFileName).toString();
        test(snapshotPath, idl, query, { rootValue });
      });
    }
  });
});
