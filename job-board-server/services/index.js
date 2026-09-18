// services/index.js
const authService        = require('./auth.service');
const jobService         = require('./job.service');
const seekerService      = require('./seeker.service');
const applicationService = require('./application.service');

module.exports = { authService, jobService, seekerService, applicationService };
