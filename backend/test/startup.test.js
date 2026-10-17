import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

test('database configuration rejects missing and blank URI before connecting', async (t) => {
  const original = process.env.MONGO_URI;
  t.after(() => original === undefined ? delete process.env.MONGO_URI : process.env.MONGO_URI = original);
  const connect = t.mock.method(mongoose, 'connect', async () => {});
  delete process.env.MONGO_URI;
  await assert.rejects(connectDB(), /MONGO_URI is required/);
  process.env.MONGO_URI = '   ';
  await assert.rejects(connectDB(), /MONGO_URI is required/);
  assert.equal(connect.mock.callCount(), 0);
});

test('database reads the current environment and sanitizes driver failures', async (t) => {
  const original = process.env.MONGO_URI;
  t.after(() => original === undefined ? delete process.env.MONGO_URI : process.env.MONGO_URI = original);
  const uri = 'mongodb://localhost:27017/startup_test';
  process.env.MONGO_URI = ` ${uri} `;
  const connect = t.mock.method(mongoose, 'connect', async () => {});
  await connectDB();
  assert.equal(connect.mock.calls[0].arguments[0], uri);
  connect.mock.mockImplementation(async () => { throw new Error('sensitive-driver-detail'); });
  await assert.rejects(connectDB(), (error) => {
    assert.match(error.message, /MongoDB connection failed/);
    assert.doesNotMatch(error.message, /sensitive-driver-detail|localhost/);
    assert.equal(error.cause, undefined);
    return true;
  });
});

test('incomplete URI fails safely with the real MongoDB parser', async (t) => {
  const original = process.env.MONGO_URI;
  t.after(() => original === undefined ? delete process.env.MONGO_URI : process.env.MONGO_URI = original);
  process.env.MONGO_URI = 'mongodb+srv://';
  await assert.rejects(connectDB(), /MongoDB connection failed/);
});

test('missing configuration exits startup without listening or scheduling jobs', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, MONGO_URI: '', DOTENV_CONFIG_PATH: '__nonexistent_test_env__' },
  });
  let output = '';
  child.stdout.on('data', (data) => output += data);
  child.stderr.on('data', (data) => output += data);
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  assert.equal(code, 1);
  assert.match(output, /MONGO_URI is required/);
  assert.doesNotMatch(output, /Server running|Verification job started/);
});

test('startup waits for MongoDB and health tracks connection loss', { timeout: 15000 }, async (t) => {
  const child = spawn(process.execPath, ['--input-type=module', '--eval', `
    import mongoose from 'mongoose';
    import express from 'express';
    import cron from 'node-cron';
    import assert from 'node:assert/strict';
    let connected = false;
    mongoose.connect = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      connected = true;
      mongoose.connection.readyState = 1;
    };
    cron.schedule = () => { assert.equal(connected, true); };
    const listen = express.application.listen;
    express.application.listen = function () {
      assert.equal(connected, true);
      const server = listen.call(this, 0, '127.0.0.1', () => {
        process.send({ port: server.address().port });
      });
      return server;
    };
    process.on('message', () => {
      mongoose.connection.readyState = 0;
      process.send({ disconnected: true });
    });
    await import('./server.js');
  `], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, MONGO_URI: 'mongodb://localhost:27017/test', DOTENV_CONFIG_PATH: '__nonexistent_test_env__' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  t.after(() => child.kill());
  const [message] = await once(child, 'message');
  const url = `http://127.0.0.1:${message.port}/api/health`;
  let response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', db: 'connected' });
  const disconnected = once(child, 'message');
  child.send('disconnect');
  await disconnected;
  response = await fetch(url);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable', db: 'disconnected' });
});
