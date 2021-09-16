module.exports = {
  branches: ['main', 'cicd'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    // [
    //   '@semantic-release/exec',
    //   {
    //     prepareCmd:
    //       'echo ${lastRelease.version} > old_version && echo ${nextRelease.version} > new_version',
    //   },
    // ],
    // [
    //   '@semantic-release/github',
    //   {
    //     successComment: false,
    //     failComment: false,
    //   },
    // ],
    // '@semantic-release/git',
  ],
};
