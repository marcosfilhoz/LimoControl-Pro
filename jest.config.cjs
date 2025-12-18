/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testMatch: ["<rootDir>/test/**/*.test.ts"],
};


