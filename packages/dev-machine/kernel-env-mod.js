module.exports = {
  "kernel.core.node": {
    "activatePkgs": [
      // "/home/alec/MOODLENET/repo/moodlenet3/packages/webapp/index.js",
      // "/home/alec/MOODLENET/repo/moodlenet3/packages/pri-http/index.js",
      // "/home/alec/MOODLENET/repo/moodlenet3/packages/test-extension/index.js",
      "@moodlenet/webapp",
      "@moodlenet/pri-http",
      "@moodlenet/test-extension",
    ]
  }
  ,
  "kernel.core": {},
  "moodlenet.pri-http": {
    "port": 8888
  }
}
