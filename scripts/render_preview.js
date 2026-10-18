#!/usr/bin/env node
/**
 * render_preview.js — Preview rápido a 360p / 15fps
 */
'use strict';
process.argv.push('--preview');
require('./render_final.js');
