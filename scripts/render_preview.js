#!/usr/bin/env node
/**
 * render_preview.js — Preview rápido (540×960 @ 30fps, JPEG q82, x264 ultrafast)
 */
'use strict';
process.argv.push('--quality', 'preview');
require('./render_final.js');
