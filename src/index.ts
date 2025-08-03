import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { CloudflareBindings } from './common';
import Lost from './losts';
import Found from './founds';
import Matche from './matches';
import reporterAccount from './reporters';
const app = new Hono();
const api = new Hono<{ Bindings: CloudflareBindings }>();

app.use('*', logger());
app.use('*', cors());
app.use('*', prettyJSON());

Lost(api);
Found(api);
Matche(api);
reporterAccount(api);

app.route('/api', api);

export default app;
