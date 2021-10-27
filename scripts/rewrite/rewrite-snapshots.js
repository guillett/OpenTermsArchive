import { fileURLToPath, pathToFileURL } from 'url';
import config from 'config';
import path from 'path';
import * as initializer from './initializer/index.js';
import * as renamer from './renamer/index.js';

import { Octokit } from 'octokit';
import nodeFetch from 'node-fetch';

const octokit = new Octokit();


import Git from '../../src/app/history/git.js';
import { loadFile } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT_PATH = path.resolve(__dirname, '../../');
export const SNAPSHOTS_SOURCE_PATH = path.resolve(
  ROOT_PATH,
  config.get('rewrite.snapshotsSourcePath')
);
export const SNAPSHOTS_TARGET_PATH = path.resolve(ROOT_PATH, config.get('history.snapshotsPath'));

const initialize = process.argv.includes('--init');

const COUNTERS = {
  rewritten: 0,
  skippedNoChanges: 0,
};

let history;
(async () => {
  console.log(await octokit.request('GET /rate_limit'));
  console.time('Total time');
  console.log('Start rewritting history.');

  await renamer.loadRules();
  const sourceRepo = new Git(SNAPSHOTS_SOURCE_PATH);

  console.log('Waiting for git log… (this can take a while)');
  console.time('git-log');
  const commits = (await sourceRepo.log(['--stat=4096'])).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  console.timeEnd('git-log');
  console.log(`Source repo contains ${commits.length} commits.\n`);

  if (initialize) {
    const targetRepo = await initializer.initTargetRepo(SNAPSHOTS_TARGET_PATH);
    const [readmeCommit] = commits;
    await initializer.initReadmeAndLicense(targetRepo, SNAPSHOTS_TARGET_PATH, readmeCommit.date);
  }

  history = await import(pathToFileURL(path.resolve(ROOT_PATH, 'src/app/history/index.js'))); // history module needs the target repo to be initiliazed. So loads it after target repo initialization.
  await history.init();

  const filteredCommits = commits.filter(({ message }) =>
    message.match(/^(Start tracking|Update)/));


  console.log('filteredCommits', filteredCommits.length);
  /* eslint-disable no-await-in-loop */
  /* eslint-disable no-continue */
  // for (const commit of filteredCommits) {
    filteredCommits.forEach(async (commit) => {
    console.log(Date.now(), commit.hash, commit.date, commit.message);

    await sourceRepo.checkout(commit.hash);

    const [{ file: relativeFilePath }] = commit.diff.files;

    let serviceId = path.dirname(relativeFilePath);
    let documentType = path.basename(relativeFilePath, path.extname(relativeFilePath));

    ({ serviceId, documentType } = renamer.applyRules(serviceId, documentType));

    const body = await getCommitContent(commit.hash);

    const { id: snapshotId } = await history.recordSnapshot({
      serviceId,
      documentType,
      content: body,
      mimeType: '.html',
      authorDate: commit.date,
      extraChangelogContent: commit.body,
    });

    if (snapshotId) {
      COUNTERS.rewritten++;
    } else {
      COUNTERS.skippedNoChanges++;
    }
  });

  // const totalTreatedCommits = Object.values(COUNTERS).reduce((acc, value) => acc + value, 0);
  // console.log(`\nCommits treated: ${totalTreatedCommits} on ${filteredCommits.length}`);
  // console.log(`⌙ Commits rewritten: ${COUNTERS.rewritten}`);
  // console.log(`⌙ Skipped not changed commits: ${COUNTERS.skippedNoChanges}`);
  // console.timeEnd('Total time');

  // if (totalTreatedCommits != filteredCommits.length) {
  //   console.error(
  //     '\n⚠ WARNING: Total treated commits does not match the total number of commits to be treated! ⚠'
  //   );
  // }
})();

async function getCommitContent(sha) {
  console.time(sha);
  const result = await octokit.request(`GET /repos/ambanum/OpenTermsArchive-snapshots/commits/${sha}`, {
    owner: 'ambanum',
    repo: 'OpenTermsArchive-snapshots',
    commit_sha: sha
  })

  console.log(result.data.files[0].raw_url);

  const response = await nodeFetch(result.data.files[0].raw_url);
  console.timeEnd(sha);

  return await response.text();
}
