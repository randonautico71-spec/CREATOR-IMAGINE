#!/usr/bin/env node
/**
 * validate_timeline.js — Valida un timeline.json contra el schema oficial.
 * Uso: node scripts/validate_timeline.js projects/<slug>/timeline.json
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const Ajv  = require('ajv');

const timelinePath = process.argv[2];
if (!timelinePath) {
  console.error('[Validate] Uso: node scripts/validate_timeline.js <timeline.json>');
  process.exit(1);
}

const schemaPath = path.resolve('schema/timeline.schema.json');

try {
  const schema   = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(timeline);

  if (valid) {
    const totalDur = (timeline.scenes || []).reduce((a, s) => a + s.duration, 0);
    const nScenes  = (timeline.scenes || []).length;
    console.log(`[Validate] ✓ Timeline válido`);
    console.log(`           Escenas: ${nScenes} | Duración: ${totalDur.toFixed(2)}s | Tema: ${timeline.theme}`);
    process.exit(0);
  } else {
    console.error('[Validate] ✗ Errores de validación:');
    validate.errors.forEach(e => {
      console.error(`  • ${e.instancePath || '/'} → ${e.message}`);
    });
    process.exit(1);
  }
} catch (err) {
  console.error('[Validate] ERROR:', err.message);
  process.exit(1);
}
