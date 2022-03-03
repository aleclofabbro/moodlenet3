"use strict";
const lib = require("./lib")
module.exports = {
  ...lib,
  default: lib,
  boot: lib.v1.boot
}
