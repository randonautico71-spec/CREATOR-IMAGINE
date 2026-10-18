#!/usr/bin/env node
/**
 * render_final.js — Delegador al motor de render principal
 * Uso: node scripts/render_final.js --project projects/<slug>/
 */
'use strict';
const path = require('path');
// Lanzar el worker con los args pasados
process.chdir(path.resolve(__dirname, '..'));
require('../engine/render_worker.js');
